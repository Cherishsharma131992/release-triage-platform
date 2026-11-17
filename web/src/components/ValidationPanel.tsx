import type { Assessment } from '../api';
import { Kpi } from './HealthPanel';

export function ValidationPanel({ a }: { a: Assessment }) {
  const v = a.validationSummary;
  return (
    <section className="card">
      <h3>Playwright MCP validation</h3>
      <div className="kpis">
        <Kpi label="Selected for re-run" value={v.selected} />
        <Kpi label="Reproduced" value={v.reproduced} tone={v.reproduced ? 'bad' : undefined} />
        <Kpi label="Intermittent" value={v.intermittent} tone={v.intermittent ? 'warn' : undefined} />
        <Kpi label="Not reproduced" value={v.notReproduced} tone="good" />
        <Kpi label="Inconclusive" value={v.inconclusive + v.differentFailure} tone={v.inconclusive + v.differentFailure ? 'warn' : undefined} />
      </div>
      <p className="muted small">
        {v.totalAttempts} re-executions: {v.passedAttempts} passed · {v.failedAttempts} failed · {v.erroredAttempts} errored · {v.notEligible} failure(s) not eligible
      </p>
      <p className="muted small">A passing re-run is never treated as proof that the original failure was false.</p>
    </section>
  );
}
