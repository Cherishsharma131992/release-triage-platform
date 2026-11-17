import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';
import { AllureResultsDirAdapter, parseProperties } from '../../src/adapters/live/allureResults';
import { createApp } from '../../src/app';
import { bootstrap } from '../../src/bootstrap';
import { HeuristicProvider } from '../../src/ai/heuristicProvider';
import { assessPendingExecutions } from '../../src/pipeline/watcher';
import { Store } from '../../src/store/store';
import request from 'supertest';
import { POLICY_PATH } from '../helpers';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'allure-'));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

function writeRun(name: string, results: object[], files: Record<string, string | Buffer> = {}, env = 'RELEASE=2.15.0\nENVIRONMENT=staging\n') {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'environment.properties'), env);
  fs.writeFileSync(path.join(dir, 'executor.json'), JSON.stringify({ name: 'GitHub Actions', buildName: `#${name}`, buildUrl: `https://ci/${name}` }));
  results.forEach((r, i) => fs.writeFileSync(path.join(dir, `${i}-result.json`), JSON.stringify(r)));
  for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), c);
}

const result = (uuid: string, key: string, status: string, start: number, extra: object = {}) => ({
  uuid,
  historyId: `h-${key}`,
  name: `Test ${key}`,
  fullName: `suite.${key}`,
  status,
  start,
  stop: start + 1000,
  labels: [{ name: 'testSource', value: 'tests/x.spec.ts' }],
  links: [{ type: 'tms', name: key, url: `https://zephyr/${key}` }],
  attachments: [],
  ...extra,
});

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
writeRun('run-100', [
  result('a1', 'SHOP-T101', 'failed', 1000, { statusDetails: { message: 'flaky first try' } }),
  result('a2', 'SHOP-T101', 'passed', 5000),
  result('b1', 'SHOP-T405', 'failed', 2000, {
    statusDetails: { message: 'Error: expect(received).toBe(expected)\nExpected: 200\nReceived: 500', trace: 'at tests/payment.spec.ts:12:5' },
    attachments: [{ name: 'screenshot', source: 'b1-shot.png', type: 'image/png' }],
    steps: [{ attachments: [{ name: 'console', source: 'b1-log.txt', type: 'text/plain' }] }],
  }),
], { 'b1-shot.png': PNG, 'b1-log.txt': 'POST /api/pay 500' });
writeRun('run-099', [result('c1', 'SHOP-T101', 'passed', 500)], {}, 'release = 2.14.9\n# comment\nenv: qa\n');

describe('AllureResultsDirAdapter', () => {
  it('parses environment.properties', () => {
    expect(parseProperties('a=1\n# x\nb : two\n')).toEqual({ a: '1', b: 'two' });
  });

  it('lists executions with metadata and keeps the last retry', async () => {
    const store = new Store(':memory:');
    const a = new AllureResultsDirAdapter(root, store);
    const list = await a.listExecutions();
    expect(list.map((e) => e.executionId)).toEqual(['run-099', 'run-100']);
    expect(list[0]).toMatchObject({ release: '2.14.9', environment: 'qa' });
    const ex = await a.getExecution('run-100');
    expect(ex).toMatchObject({ release: '2.15.0', environment: 'staging', build: '#run-100', triggeredBy: 'GitHub Actions', ciJobUrl: 'https://ci/run-100' });
    expect(ex.results).toHaveLength(2);
    expect(ex.results.find((r) => r.testCaseKey === 'SHOP-T101')?.status).toBe('passed');
    const failed = ex.results.find((r) => r.testCaseKey === 'SHOP-T405')!;
    expect(failed.attachments.map((x) => [x.id, x.kind])).toEqual([['run-100/b1-shot.png', 'screenshot'], ['run-100/b1-log.txt', 'log']]);
    expect(store.getArtifact('run-100/b1-shot.png')?.encoding).toBe('base64');
    await expect(a.getExecution('nope')).rejects.toThrow(/not found/);
  });

  it('runs the full pipeline on real Allure output and serves binary evidence', async () => {
    const ctx = bootstrap({ dbPath: ':memory:', policyPath: POLICY_PATH, env: { RESULTS_ADAPTER: 'live', ALLURE_RESULTS_DIR: root }, ai: new HeuristicProvider() });
    await assessPendingExecutions(ctx.adapters.results, ctx.store, ctx.service, () => {});
    const latest = ctx.store.latestAssessment()!;
    expect(latest.execution.executionId).toBe('run-100');
    expect(latest.failures.map((f) => f.testCaseKey)).toEqual(['SHOP-T405']);
    const res = await request(createApp(ctx)).get('/api/artifacts/run-100%2Fb1-shot.png').expect(200).expect('content-type', /png/);
    expect(Buffer.compare(res.body as Buffer, PNG)).toBe(0);
  });
});
