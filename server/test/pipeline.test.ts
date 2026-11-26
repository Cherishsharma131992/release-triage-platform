import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { assessPendingExecutions } from '../src/pipeline/watcher';
import { testContext } from './helpers';

async function runAll(unavailable: string[] = []) {
  const ctx = testContext(unavailable);
  await assessPendingExecutions(ctx.adapters.results, ctx.store, ctx.service, () => {});
  const byExec = new Map(ctx.store.listAssessments().map((a) => [a.executionId, ctx.store.getAssessment(a.id)!]));
  return { ctx, byExec };
}

describe('end-to-end triage pipeline', () => {
  it('produces NO_GO, HOLD and GO for rc.3, rc.4 and rc.5', async () => {
    const { byExec } = await runAll();
    expect(byExec.get('exec-2.14.0-rc.3')!.decision.decision).toBe('NO_GO');
    expect(byExec.get('exec-2.14.0-rc.4')!.decision.decision).toBe('HOLD');
    expect(byExec.get('exec-2.14.0-rc.5')!.decision.decision).toBe('GO');
  });

  it('classifies rc.3 failures correctly', async () => {
    const { byExec } = await runAll();
    const a = byExec.get('exec-2.14.0-rc.3')!;
    const f = Object.fromEntries(a.failures.map((x) => [x.testCaseKey, x]));
    expect(f['SHOP-T205'].category).toBe('KNOWN_OPEN_DEFECT');
    expect(f['SHOP-T205'].waiver?.id).toBe('WVR-0001');
    expect(f['SHOP-T301'].category).toBe('KNOWN_OPEN_DEFECT');
    expect(f['SHOP-T402'].category).toBe('NEW_WITH_JIRA');
    expect(f['SHOP-T402'].jira?.issue.key).toBe('SHOP-1301');
    expect(f['SHOP-T405'].validation.status).toBe('REPRODUCED');
    expect(f['SHOP-T405'].finalAnalysis.classification).toBe('APPLICATION_DEFECT');
    expect(f['SHOP-T405'].potentialGenuineDefect).toBe(true);
    expect(f['SHOP-T512'].validation.status).toBe('NOT_REPRODUCED');
    expect(f['SHOP-T512'].finalAnalysis.classification).toBe('TIMING_SYNC');
    expect(f['SHOP-T610'].finalAnalysis.classification).toBe('AUTOMATION_SCRIPT');
    expect(f['SHOP-T702'].finalAnalysis.classification).toBe('ENVIRONMENT');
    expect(f['SHOP-T215'].finalAnalysis.classification).toBe('TEST_DATA');
    expect(f['SHOP-T803'].validation.status).toBe('INTERMITTENT');
    expect(f['SHOP-T803'].finalAnalysis.classification).toBe('FLAKY');
    expect(f['SHOP-T120'].validation.status).toBe('INCONCLUSIVE');
    expect(f['SHOP-T120'].finalAnalysis.classification).toBe('INCONCLUSIVE');
    const failedRules = a.decision.criteria.filter((c) => !c.passed).map((c) => c.ruleId);
    expect(failedRules).toEqual(expect.arrayContaining(['REL-002', 'REL-003', 'REL-004', 'REL-006', 'REL-007']));
    expect(a.audit.policy.version).toBe('1.0.0');
    expect(a.audit.model.provider).toBe('builtin');
  });

  it('marks recurring failures using history from earlier assessments', async () => {
    const { byExec } = await runAll();
    const t512 = byExec.get('exec-2.14.0-rc.4')!.failures.find((f) => f.testCaseKey === 'SHOP-T512')!;
    expect(t512.recurrence).toBe('RECURRING');
    expect(t512.history.lastSeenRelease).toBe('2.14.0');
  });

  it('a new waiver turns rc.4 HOLD into a narrower HOLD (validation still pending)', async () => {
    const { ctx } = await runAll();
    ctx.store.addWaiver({ id: 'W-T', jiraKey: 'SHOP-1192', release: '2.14.0', approvedBy: 'CFO', approverRole: 'CFO', approvedAt: '2026-01-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z', justification: 'Accepted minor promo issue' });
    const a = await ctx.service.assess('exec-2.14.0-rc.4');
    const failed = a.decision.criteria.filter((c) => !c.passed).map((c) => c.ruleId);
    expect(failed).not.toContain('REL-006');
    expect(failed).toContain('REL-007');
    expect(a.decision.decision).toBe('HOLD');
  });

  it('returns HOLD when Jira is unavailable', async () => {
    const { byExec } = await runAll(['jira']);
    const a = byExec.get('exec-2.14.0-rc.5')!;
    expect(a.decision.decision).toBe('HOLD');
    expect(a.integrations.find((i) => i.adapter === 'file-jira')?.status).toBe('UNAVAILABLE');
  });

  it('exposes the assessment over the API', async () => {
    const { ctx } = await runAll();
    const app = createApp(ctx);
    const list = await request(app).get('/api/assessments').expect(200);
    expect(list.body).toHaveLength(3);
    const latest = await request(app).get('/api/assessments/latest').expect(200);
    expect(latest.body.execution.executionId).toBe('exec-2.14.0-rc.5');
    const shot = latest.body.failures[0].attachments[0].id;
    await request(app).get(`/api/artifacts/${shot}`).expect(200).expect('content-type', /svg/);
    await request(app).post('/api/waivers').send({ jiraKey: 'X' }).expect(400);
    await request(app).post('/api/assessments').send({ executionId: 'nope' }).expect(404);
  });
});
