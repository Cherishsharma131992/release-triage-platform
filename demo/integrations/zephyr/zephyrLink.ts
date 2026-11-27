import fs from 'fs';
import path from 'path';
import * as allure from 'allure-js-commons';

const env = process.env;
const tcm = (env.TCM_ADAPTER ?? (env.ADAPTER_MODE === 'live' ? 'live' : 'mock')).toLowerCase();
/** Local key → remote key, written by `npm run zephyr:import` / `npm run testrail:import`; used only when cases come from that tool. */
const keyMapFile = { live: path.join(__dirname, 'zephyr-key-map.json'), testrail: path.join(__dirname, '..', 'testrail', 'testrail-key-map.json') }[tcm];
const keyMap: Record<string, string> = keyMapFile && fs.existsSync(keyMapFile) ? JSON.parse(fs.readFileSync(keyMapFile, 'utf8')) : {};
const testRailUrl = env.TESTRAIL_URL?.replace(/\/+$/, '');

/** Links the test to its test case (Allure TMS link) and records the script path. */
export async function zephyr(localKey: string, script: string): Promise<void> {
  const key = keyMap[localKey] ?? localKey;
  const url =
    tcm === 'testrail' && testRailUrl && /^C\d+$/.test(key)
      ? `${testRailUrl}/index.php?/cases/view/${key.slice(1)}`
      : `https://demo-shop.zephyr.example/testcase/${key}`;
  await allure.tms(url, key);
  await allure.label('testSource', script);
}
