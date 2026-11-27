import './loadEnv';
import { createApp } from './app';
import { bootstrap } from './bootstrap';
import { config } from './config';
import { assessPendingExecutions } from './pipeline/watcher';

async function main() {
  const ctx = bootstrap({
    dbPath: config.dbPath,
    policyPath: config.policyPath,
    mockUnavailable: config.mockUnavailable,
    seedDemoData: config.seedDemoData,
  });
  const app = createApp({ ...ctx, webDist: config.webDist });
  app.listen(config.port, () => {
    console.log(`Release triage platform API on http://localhost:${config.port} (AI: ${ctx.ai.info.provider}/${ctx.ai.info.model})`);
    console.log(`Adapters: ${Object.entries(ctx.adapters).map(([k, a]) => `${k}=${a.adapter}`).join(', ')}`);
  });
  const poll = () =>
    assessPendingExecutions(ctx.adapters.results, ctx.store, ctx.service).catch((err) => console.error('[watcher]', err.message));
  await poll();
  if (config.pollIntervalMs > 0) setInterval(poll, config.pollIntervalMs);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
