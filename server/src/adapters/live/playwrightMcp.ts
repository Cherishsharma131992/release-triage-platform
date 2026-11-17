import os from 'os';
import path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Attachment } from '../../domain/types';
import type { ArtifactSink } from '../../store/store';
import type { HealthCheckResult, RevalidationAdapter, RevalidationRequest, RevalidationRun } from '../types';
import { planTestCase, type McpAction } from './stepPlan';

export interface PlaywrightMcpConfig {
  /** Streamable HTTP endpoint of a running Playwright MCP server; when unset a local `@playwright/mcp` is spawned per attempt. */
  serverUrl: string | null;
  baseUrl: string | null;
  executablePath: string | null;
  extraArgs: string[];
  stepTimeoutMs: number;
}

export function playwrightMcpConfigFromEnv(env: NodeJS.ProcessEnv): PlaywrightMcpConfig {
  return {
    serverUrl: env.PLAYWRIGHT_MCP_URL?.trim() || null,
    baseUrl: env.PLAYWRIGHT_BASE_URL?.trim() || null,
    executablePath: env.PLAYWRIGHT_MCP_EXECUTABLE_PATH?.trim() || null,
    extraArgs: (env.PLAYWRIGHT_MCP_ARGS ?? '').split(' ').filter(Boolean),
    stepTimeoutMs: Number(env.PLAYWRIGHT_MCP_STEP_TIMEOUT_MS ?? 60_000),
  };
}

interface ToolResult {
  isError?: boolean;
  content?: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
}

const textOf = (r: ToolResult) => (r.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n');
const errorOf = (r: ToolResult) => textOf(r).replace(/^### Error\s*/, '').trim();

/**
 * Re-executes approved Zephyr test cases through a Playwright MCP server.
 * Steps are translated deterministically (see stepPlan.ts); a step outside the grammar makes the run inconclusive
 * rather than guessed.
 */
export class PlaywrightMcpAdapter implements RevalidationAdapter {
  readonly name = 'Playwright MCP';
  readonly adapter = 'playwright-mcp';

  constructor(private readonly cfg: PlaywrightMcpConfig, private readonly artifacts: ArtifactSink) {}

  private async connect(): Promise<Client> {
    const client = new Client({ name: 'release-triage-platform', version: '0.1.0' });
    if (this.cfg.serverUrl) {
      await client.connect(new StreamableHTTPClientTransport(new URL(this.cfg.serverUrl)));
    } else {
      const cli = path.join(path.dirname(require.resolve('@playwright/mcp/package.json')), 'cli.js');
      const args = [cli, '--headless', '--isolated', '--output-dir', path.join(os.tmpdir(), 'playwright-mcp'), ...this.cfg.extraArgs];
      if (this.cfg.executablePath) args.push('--executable-path', this.cfg.executablePath);
      await client.connect(new StdioClientTransport({ command: process.execPath, args, stderr: 'ignore' }));
    }
    return client;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    let client: Client | null = null;
    try {
      client = await this.connect();
      const { tools } = await client.listTools();
      const missing = ['browser_navigate', 'browser_click', 'browser_type', 'browser_wait_for', 'browser_take_screenshot'].filter(
        (t) => !tools.some((x) => x.name === t),
      );
      return missing.length ? { ok: false, message: `Playwright MCP server lacks tools: ${missing.join(', ')}` } : { ok: true };
    } catch (err) {
      return { ok: false, message: `Playwright MCP unreachable: ${(err as Error).message}` };
    } finally {
      await client?.close().catch(() => {});
    }
  }

  async runTestCase(req: RevalidationRequest): Promise<RevalidationRun> {
    const plan = planTestCase(req.testCase.steps, this.cfg.baseUrl);
    const id = `pw-${req.executionId}-${req.testCase.key}-attempt${req.attempt}-${Date.now()}`;
    const log: string[] = [];
    const trace: Array<{ step: number; action: string; tool: string; status: 'passed' | 'failed' | 'skipped'; ms: number }> = [];
    const started = Date.now();
    const client = await this.connect();
    let failure: { action: McpAction; message: string } | null = null;
    const attachments: Attachment[] = [];
    try {
      for (const action of plan) {
        if (failure) {
          trace.push({ step: action.step, action: action.description, tool: action.tool, status: 'skipped', ms: 0 });
          continue;
        }
        const t0 = Date.now();
        log.push(`mcp> ${action.tool} ${JSON.stringify(action.args)}`);
        const res = (await client.callTool({ name: action.tool, arguments: action.args }, undefined, { timeout: this.cfg.stepTimeoutMs })) as ToolResult;
        const ok = !res.isError;
        log.push(ok ? textOf(res).split('\n').slice(0, 6).join('\n') : `ERROR ${errorOf(res)}`);
        trace.push({ step: action.step, action: action.description, tool: action.tool, status: ok ? 'passed' : 'failed', ms: Date.now() - t0 });
        if (!ok) failure = { action, message: errorOf(res) };
      }
      const shot = (await client.callTool({ name: 'browser_take_screenshot', arguments: { type: 'png' } })) as ToolResult;
      const image = shot.content?.find((c) => c.type === 'image' && c.data);
      if (image?.data) {
        this.artifacts.putArtifact({ id: `${id}-screenshot.png`, name: 'revalidation-screenshot.png', contentType: image.mimeType ?? 'image/png', content: image.data, encoding: 'base64' });
        attachments.push({ id: `${id}-screenshot.png`, name: 'Re-execution screenshot', contentType: image.mimeType ?? 'image/png', kind: 'screenshot' });
      }
      if (this.cfg.serverUrl) await client.callTool({ name: 'browser_close', arguments: {} }).catch(() => {});
    } finally {
      await client.close().catch(() => {});
    }
    const errorMessage = failure ? `Step ${failure.action.step} (${failure.action.description}) failed: ${failure.message.split('\n')[0]}` : null;
    log.push(failure ? `RESULT failed at step ${failure.action.step}` : 'RESULT passed');
    this.artifacts.putArtifact({ id: `${id}-trace.json`, name: 'trace.json', contentType: 'application/json', content: JSON.stringify({ testCase: req.testCase.key, attempt: req.attempt, actions: trace }, null, 2) });
    this.artifacts.putArtifact({ id: `${id}-mcp.log`, name: 'mcp-session.log', contentType: 'text/plain', content: log.join('\n') });
    attachments.push(
      { id: `${id}-trace.json`, name: 'Re-execution trace', contentType: 'application/json', kind: 'trace' },
      { id: `${id}-mcp.log`, name: 'MCP session log', contentType: 'text/plain', kind: 'log' },
    );
    return {
      status: failure ? 'failed' : 'passed',
      durationMs: Date.now() - started,
      errorMessage,
      stackTrace: failure ? failure.message : null,
      attachments,
    };
  }
}
