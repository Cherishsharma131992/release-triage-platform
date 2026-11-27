import http from 'http';
import type { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PlaywrightMcpAdapter, playwrightMcpConfigFromEnv } from '../../src/integrations/playwright-mcp/playwrightMcp';
import type { TestCase } from '../../src/domain/types';
import { Store } from '../../src/store/store';

/** Drives a real Playwright MCP server + browser. Opt in with PLAYWRIGHT_MCP_E2E=1. */
const enabled = !!process.env.PLAYWRIGHT_MCP_E2E;

const PAGE = `<!doctype html><title>Shop</title>
<label>Email <input id=e></label><label>Password <input id=p type=password></label>
<button onclick="document.getElementById('out').textContent = document.getElementById('e').value ? 'Welcome back' : 'Email required'">Sign in</button>
<div id=out></div>`;

let server: http.Server;
let baseUrl = '';
beforeAll(async () => {
  if (!enabled) return;
  server = http.createServer((_req, res) => res.writeHead(200, { 'content-type': 'text/html' }).end(PAGE));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server?.close());

const tc = (steps: Array<[string, string]>): TestCase => ({
  key: 'SHOP-T101',
  name: 'Login',
  objective: '',
  component: 'Auth',
  priority: 'Critical',
  businessCritical: true,
  steps: steps.map(([action, expected], i) => ({ index: i + 1, action, expected })),
  automationScript: '',
  playwrightRevalidationApproved: true,
  labels: [],
});

describe.skipIf(!enabled)('PlaywrightMcpAdapter (real MCP server)', () => {
  const run = (testCase: TestCase) => {
    const store = new Store(':memory:');
    const adapter = new PlaywrightMcpAdapter({ ...playwrightMcpConfigFromEnv(process.env), baseUrl, stepTimeoutMs: 20_000 }, store);
    return { store, adapter, promise: adapter.runTestCase({ executionId: 'e2e', testCase, attempt: 1, originalErrorMessage: null, originalStackTrace: null }) };
  };

  it('passes a working flow and captures a PNG screenshot', async () => {
    const { store, adapter, promise } = run(tc([['Navigate to /', ''], ['Enter "qa@shop.io" into "Email"', ''], ['Click button "Sign in"', 'Shows "Welcome back"']]));
    expect(await adapter.healthCheck()).toEqual({ ok: true });
    const r = await promise;
    expect(r.status).toBe('passed');
    const shot = r.attachments.find((a) => a.kind === 'screenshot')!;
    expect(store.getArtifact(shot.id)?.encoding).toBe('base64');
    expect(store.getArtifact(r.attachments.find((a) => a.kind === 'log')!.id)?.content).toContain('RESULT passed');
  }, 90_000);

  it('reproduces a failure at the failing step', async () => {
    const r = await run(tc([['Navigate to /', ''], ['Click button "Sign in"', 'Shows "Welcome back"']])).promise;
    expect(r.status).toBe('failed');
    expect(r.errorMessage).toMatch(/^Step 2 \(Expected: "Welcome back" is visible\) failed: TimeoutError/);
  }, 90_000);

  it('reports a browser that cannot start as an error, not a test failure', async () => {
    const store = new Store(':memory:');
    const adapter = new PlaywrightMcpAdapter({ ...playwrightMcpConfigFromEnv({}), baseUrl, executablePath: '/nonexistent/chrome', stepTimeoutMs: 20_000 }, store);
    expect((await adapter.healthCheck()).ok).toBe(false);
    await expect(adapter.runTestCase({ executionId: 'e2e', testCase: tc([['Navigate to /', '']]), attempt: 1, originalErrorMessage: null, originalStackTrace: null })).rejects.toThrow(/could not start the browser/);
  }, 90_000);

  it('refuses free-text steps', async () => {
    await expect(run(tc([['Log in as a gold customer', '']])).promise).rejects.toThrow(/automatable/);
  });
});
