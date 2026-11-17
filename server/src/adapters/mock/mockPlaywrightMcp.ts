import type { ArtifactSink } from '../../store/store';
import type { HealthCheckResult, RevalidationAdapter, RevalidationRequest, RevalidationRun } from '../types';
import { renderScreenshotSvg, renderTrace } from './artifacts';
import { REVALIDATION_SCENARIOS } from './data/failures';

/**
 * Simulates a Playwright MCP server executing the approved test case steps.
 * Behaviour per test case is defined by REVALIDATION_SCENARIOS.
 */
export class MockPlaywrightMcpAdapter implements RevalidationAdapter {
  readonly name = 'Playwright MCP';
  readonly adapter = 'mock-playwright-mcp';

  constructor(private readonly artifacts: ArtifactSink, private readonly available = true) {}

  async healthCheck(): Promise<HealthCheckResult> {
    return this.available ? { ok: true } : { ok: false, message: 'Playwright MCP server unreachable (mock outage)' };
  }

  async runTestCase(req: RevalidationRequest): Promise<RevalidationRun> {
    if (!this.available) throw new Error('Playwright MCP server unreachable (mock outage)');
    const scenario = REVALIDATION_SCENARIOS[req.testCase.key] ?? 'pass';
    if (scenario === 'mcp_error') {
      throw new Error('Playwright MCP session timed out after 120000ms: browser context could not be created');
    }
    const outcome = Array.isArray(scenario) ? scenario[(req.attempt - 1) % scenario.length] : scenario;
    const failed = outcome === 'fail_same';
    const id = `pw-${req.executionId}-${req.testCase.key}-attempt${req.attempt}`;
    const errorMessage = failed && req.originalErrorMessage
      ? req.originalErrorMessage.replace(/\b\d{2,}\b/g, (n) => (n.length >= 5 ? String(Number(n) + req.attempt) : n))
      : null;
    const steps = req.testCase.steps.map((s) => s.action);
    this.artifacts.putArtifact({
      id: `${id}-screenshot.svg`,
      name: 'revalidation-screenshot.svg',
      contentType: 'image/svg+xml',
      content: renderScreenshotSvg(
        req.testCase.name,
        `Playwright MCP re-execution • attempt ${req.attempt}`,
        failed ? (errorMessage ?? 'Failed') : 'All steps passed ✔',
        !failed,
      ),
    });
    this.artifacts.putArtifact({
      id: `${id}-trace.json`,
      name: 'trace.json',
      contentType: 'application/json',
      content: renderTrace(req.testCase.name, steps, failed ? 3 : null),
    });
    this.artifacts.putArtifact({
      id: `${id}-mcp.log`,
      name: 'mcp-session.log',
      contentType: 'text/plain',
      content: [
        `mcp> browser_navigate {"url":"https://staging.shop.example.com"}`,
        ...steps.map((s, i) => `mcp> step ${i + 1}: ${s} ... ${failed && i === 2 ? 'FAILED' : failed && i > 2 ? 'SKIPPED' : 'ok'}`),
        failed ? `ERROR ${errorMessage}` : 'RESULT passed',
      ].join('\n'),
    });
    return {
      status: failed ? 'failed' : 'passed',
      durationMs: 9_000 + req.attempt * 1_250,
      errorMessage,
      stackTrace: failed ? req.originalStackTrace : null,
      attachments: [
        { id: `${id}-screenshot.svg`, name: 'Re-execution screenshot', contentType: 'image/svg+xml', kind: 'screenshot' },
        { id: `${id}-trace.json`, name: 'Re-execution trace', contentType: 'application/json', kind: 'trace' },
        { id: `${id}-mcp.log`, name: 'MCP session log', contentType: 'text/plain', kind: 'log' },
      ],
    };
  }
}
