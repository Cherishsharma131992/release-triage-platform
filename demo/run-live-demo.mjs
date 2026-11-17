// Live end-to-end demo: demo shop with injected bugs -> real Playwright run with Allure output ->
// platform (live Allure + live Playwright MCP re-validation, Zephyr/Jira from JSON exports) -> dashboard.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const demoDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(demoDir, '..');
const live = path.join(demoDir, '.live');
const env = process.env;
const shopPort = Number(env.SHOP_PORT ?? 4100);
const shopUrl = `http://127.0.0.1:${shopPort}`;
const port = Number(env.PORT ?? 4000);
const bugs = env.BUGS ?? 'vat,search';
const release = env.DEMO_RELEASE ?? '1.0.0';
const runId = `demo-run-${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-')}`;
const resultsRoot = path.join(live, 'allure-results');
const children = [];

const log = (msg) => console.log(`\n[demo] ${msg}`);

function start(cmd, args, opts) {
  const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
  children.push(child);
  return child;
}

const exited = (child) => new Promise((resolve) => child.on('exit', (code) => resolve(code)));

async function waitFor(url, timeoutMs = 20_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`${url} did not come up within ${timeoutMs}ms`);
}

function shutdown(code = 0) {
  for (const c of children) if (c.exitCode === null) c.kill('SIGTERM');
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

try {
  if (!fs.existsSync(path.join(root, 'server', 'dist', 'index.js'))) throw new Error('Run `npm run build` first (or use `npm run demo:live`).');
  fs.mkdirSync(resultsRoot, { recursive: true });

  log(`Starting demo shop on ${shopUrl} with injected bugs: ${bugs || 'none'}`);
  start(process.execPath, [path.join(demoDir, 'shop-app', 'server.mjs')], { env: { ...env, SHOP_PORT: String(shopPort), BUGS: bugs } });
  await waitFor(`${shopUrl}/health`);

  const runDir = path.join(resultsRoot, runId);
  log(`Running the Playwright suite -> Allure results in ${path.relative(root, runDir)}`);
  const suite = start(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['playwright', 'test'], {
    cwd: demoDir,
    env: { ...env, SHOP_URL: shopUrl, ALLURE_RUN_DIR: runDir, DEMO_BUILD: runId, DEMO_RELEASE: release },
  });
  const code = await exited(suite);
  fs.writeFileSync(path.join(runDir, 'executor.json'), JSON.stringify({ name: 'Local demo (Playwright)', type: 'local', buildName: runId }, null, 2));
  log(`Playwright finished with exit code ${code} (failures are expected: the shop has injected bugs).`);

  log(`Starting the platform on http://localhost:${port} (live Allure + Playwright MCP, Zephyr/Jira from demo/data)`);
  start(process.execPath, [path.join(root, 'server', 'dist', 'index.js')], {
    cwd: root,
    env: {
      ...env,
      PORT: String(port),
      DB_PATH: path.join(live, 'triage.db'),
      RESULTS_ADAPTER: 'live',
      ALLURE_RESULTS_DIR: resultsRoot,
      TCM_ADAPTER: 'file',
      ZEPHYR_TESTCASES_FILE: path.join(demoDir, 'data', 'zephyr-testcases.json'),
      DEFECTS_ADAPTER: 'file',
      JIRA_ISSUES_FILE: path.join(demoDir, 'data', 'jira-issues.json'),
      REVALIDATION_ADAPTER: 'live',
      PLAYWRIGHT_BASE_URL: shopUrl,
      PLAYWRIGHT_MCP_EXECUTABLE_PATH: env.PLAYWRIGHT_MCP_EXECUTABLE_PATH ?? env.DEMO_CHROME_PATH ?? '',
    },
  });
  log(`Dashboard: http://localhost:${port}  ·  Demo shop: ${shopUrl}  ·  Ctrl+C to stop. Re-run the demo to add another execution.`);
} catch (err) {
  console.error(`[demo] ${err.message}`);
  shutdown(1);
}
