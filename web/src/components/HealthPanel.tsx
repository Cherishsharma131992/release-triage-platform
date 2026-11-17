import type { Assessment } from '../api';

export function HealthPanel({ a }: { a: Assessment }) {
  const h = a.health;
  const seg = (n: number) => `${(n / h.total) * 100}%`;
  return (
    <section className="card">
      <h3>Release health</h3>
      <div className="kpis">
        <Kpi label="Total tests" value={h.total} />
        <Kpi label="Passed" value={h.passed} tone="good" />
        <Kpi label="Failed / broken" value={h.failed + h.broken} tone="bad" />
        <Kpi label="Skipped" value={h.skipped} />
        <Kpi label="Pass rate" value={`${h.passRate}%`} tone={h.passRate >= 95 ? 'good' : h.passRate >= 90 ? 'warn' : 'bad'} />
      </div>
      <div className="stack">
        <div className="good-bg" style={{ width: seg(h.passed) }} title={`Passed ${h.passed}`} />
        <div className="bad-bg" style={{ width: seg(h.failed) }} title={`Failed ${h.failed}`} />
        <div className="warn-bg" style={{ width: seg(h.broken) }} title={`Broken ${h.broken}`} />
        <div className="muted-bg" style={{ width: seg(h.skipped) }} title={`Skipped ${h.skipped}`} />
      </div>
      <p className="muted small">
        {a.execution.triggeredBy} · {a.execution.ciJobUrl && <a href={a.execution.ciJobUrl} target="_blank" rel="noreferrer">CI run</a>}
      </p>
      <div className="integrations">
        {a.integrations.map((i) => (
          <span key={i.adapter} className={`pill int-${i.status}`} title={i.message ?? ''}>
            {i.name}: {i.status}
          </span>
        ))}
      </div>
    </section>
  );
}

export function Kpi({ label, value, tone }: { label: string; value: string | number; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className={`kpi ${tone ?? ''}`}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
