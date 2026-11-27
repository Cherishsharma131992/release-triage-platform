import fs from 'fs';
import path from 'path';
import * as allure from 'allure-js-commons';

const env = process.env;
const liveZephyr = (env.TCM_ADAPTER ?? (env.ADAPTER_MODE === 'live' ? 'live' : 'mock')) === 'live';
const keyMapFile = path.join(__dirname, 'zephyr-key-map.json');
/** Local key → Zephyr key, written by `npm run zephyr:import`; only used when test cases come from live Zephyr. */
const keyMap: Record<string, string> = liveZephyr && fs.existsSync(keyMapFile) ? JSON.parse(fs.readFileSync(keyMapFile, 'utf8')) : {};

/** Links the test to its Zephyr test case (Allure TMS link) and records the script path. */
export async function zephyr(localKey: string, script: string): Promise<void> {
  const key = keyMap[localKey] ?? localKey;
  await allure.tms(`https://demo-shop.zephyr.example/testcase/${key}`, key);
  await allure.label('testSource', script);
}
