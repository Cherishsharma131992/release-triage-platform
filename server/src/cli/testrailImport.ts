import '../loadEnv';
import fs from 'fs';
import path from 'path';
import type { TestCase } from '../domain/types';
import { testRailConfigFromEnv } from '../integrations/testrail/testRail';
import { importTestCasesToTestRail } from '../integrations/testrail/testRailImport';

/**
 * Imports the demo test cases into TestRail and writes the local → TestRail key map.
 * Usage: npm run testrail:import [-- --dry-run]
 */
async function main() {
  const env = process.env;
  const dryRun = process.argv.includes('--dry-run');
  const repo = path.resolve(__dirname, '..', '..', '..');
  const file = path.resolve(env.TESTCASES_FILE ?? path.join(repo, 'demo', 'integrations', 'zephyr', 'zephyr-testcases.json'));
  const mapFile = path.resolve(env.TESTRAIL_KEY_MAP_FILE ?? path.join(repo, 'demo', 'integrations', 'testrail', 'testrail-key-map.json'));
  const project = env.TESTRAIL_PROJECT?.trim() || 'Failure Triage Project';

  const cases = JSON.parse(fs.readFileSync(file, 'utf8')) as TestCase[];
  console.log(`${dryRun ? '[dry run] ' : ''}Importing ${cases.length} test cases from ${path.relative(repo, file)} into TestRail project "${project}"`);
  const res = await importTestCasesToTestRail(cases, testRailConfigFromEnv(env), {
    project,
    sectionName: env.TESTRAIL_IMPORT_SECTION ?? 'Failure Triage Demo',
    suiteId: env.TESTRAIL_SUITE_ID ? Number(env.TESTRAIL_SUITE_ID) : undefined,
    dryRun,
    log: (m) => console.log(`  ${m}`),
  });
  if (dryRun) return;
  fs.mkdirSync(path.dirname(mapFile), { recursive: true });
  fs.writeFileSync(mapFile, JSON.stringify(res.keyMap, null, 2) + '\n');
  console.log(`Created ${res.created.length}, already present ${res.skipped.length}. Key map: ${path.relative(repo, mapFile)}`);
  console.log('Set TCM_ADAPTER=testrail in .env to read test cases from TestRail.');
}

main().catch((err) => {
  console.error(`testrail:import failed: ${(err as Error).message}`);
  process.exit(1);
});
