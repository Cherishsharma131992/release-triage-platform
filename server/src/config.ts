import path from 'path';

const root = path.resolve(__dirname, '..');

export const config = {
  port: Number(process.env.PORT ?? 4000),
  dbPath: process.env.DB_PATH ?? path.join(root, 'data', 'triage.db'),
  policyPath: process.env.POLICY_PATH ?? path.join(root, 'config', 'release-policy.yaml'),
  webDist: process.env.WEB_DIST ?? path.resolve(root, '..', 'web', 'dist'),
  mockUnavailable: (process.env.MOCK_UNAVAILABLE ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 60_000),
  seedDemoData: process.env.SEED_DEMO_DATA === undefined ? undefined : process.env.SEED_DEMO_DATA !== 'false',
};
