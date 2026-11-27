import '../loadEnv';
import fs from 'fs';
import path from 'path';
import type { TestCase } from '../domain/types';
import { importTestCasesToZephyr } from '../integrations/zephyr/zephyrImport';
import { zephyrConfigFromEnv } from '../integrations/zephyr/zephyrScale';

/**
 * Imports the demo's Zephyr test cases into Zephyr Scale Cloud and writes the local → Zephyr key map.
 * Usage: npm run zephyr:import [-- --dry-run]
 */
async function main() {
  const env = process.env;
  const dryRun = process.argv.includes('--dry-run');
  const repo = path.resolve(__dirname, '..', '..', '..');
  const zephyrDir = path.join(repo, 'demo', 'integrations', 'zephyr');
  const file = path.resolve(env.ZEPHYR_TESTCASES_FILE ?? path.join(zephyrDir, 'zephyr-testcases.json'));
  const mapFile = path.resolve(env.ZEPHYR_KEY_MAP_FILE ?? path.join(zephyrDir, 'zephyr-key-map.json'));
  const projectKey = (env.ZEPHYR_PROJECT_KEY ?? env.JIRA_PROJECT_KEYS?.split(',')[0] ?? '').trim();
  if (!projectKey) throw new Error('Set ZEPHYR_PROJECT_KEY (or JIRA_PROJECT_KEYS) to the Jira project to import into');

  const cases = JSON.parse(fs.readFileSync(file, 'utf8')) as TestCase[];
  console.log(`${dryRun ? '[dry run] ' : ''}Importing ${cases.length} test cases from ${path.relative(repo, file)} into Zephyr project ${projectKey}`);
  const res = await importTestCasesToZephyr(cases, zephyrConfigFromEnv(env), {
    projectKey,
    folderName: env.ZEPHYR_IMPORT_FOLDER ?? 'Failure Triage Demo',
    dryRun,
    log: (m) => console.log(`  ${m}`),
  });
  if (dryRun) return;
  fs.writeFileSync(mapFile, JSON.stringify(res.keyMap, null, 2) + '\n');
  console.log(`Created ${res.created.length}, already present ${res.skipped.length}. Key map: ${path.relative(repo, mapFile)}`);
  console.log('Set TCM_ADAPTER=live in .env to read test cases from Zephyr.');
}

main().catch((err) => {
  console.error(`zephyr:import failed: ${(err as Error).message}`);
  process.exit(1);
});
