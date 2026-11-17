import type { Assessment, AssessmentListItem, ExecutionSummary, Waiver } from '../../server/src/domain/types';

export type * from '../../server/src/domain/types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const issues: Array<{ path: string[]; message: string }> = body.issues ?? [];
    const detail = issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error([body.error ?? `HTTP ${res.status}`, detail].filter(Boolean).join(' — '));
  }
  return res.json() as Promise<T>;
}

export const api = {
  listAssessments: () => fetch('/api/assessments').then((r) => json<AssessmentListItem[]>(r)),
  getAssessment: (id: string) => fetch(`/api/assessments/${id}`).then((r) => json<Assessment>(r)),
  listExecutions: () => fetch('/api/executions').then((r) => json<Array<ExecutionSummary & { assessed: boolean }>>(r)),
  runAssessment: (executionId: string) =>
    fetch('/api/assessments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ executionId }),
    }).then((r) => json<Assessment>(r)),
  addWaiver: (w: Omit<Waiver, 'id' | 'approvedAt'>) =>
    fetch('/api/waivers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(w),
    }).then((r) => json<Waiver>(r)),
  artifactUrl: (id: string) => `/api/artifacts/${encodeURIComponent(id)}`,
};

export const pretty = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
export const decisionLabel = (d: string) => d.replace('_', '-');
export const pct = (n: number) => `${Math.round(n * 100)}%`;
