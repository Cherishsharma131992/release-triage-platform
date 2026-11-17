import * as allure from 'allure-js-commons';

/** Links the test to its Zephyr test case (Allure TMS link) and records the script path. */
export async function zephyr(key: string, script: string): Promise<void> {
  await allure.tms(`https://demo-shop.zephyr.example/testcase/${key}`, key);
  await allure.label('testSource', script);
}
