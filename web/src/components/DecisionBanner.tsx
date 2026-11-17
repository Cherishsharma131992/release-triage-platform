import { decisionLabel, type Assessment } from '../api';

export function DecisionBanner({ a }: { a: Assessment }) {
  const d = a.decision;
  const failed = d.criteria.filter((c) => !c.passed);
  return (
    <section className={`card decision decision-${d.decision}`} data-testid="decision-banner">
      <div className="decision-main">
        <div className="decision-badge">{decisionLabel(d.decision)}</div>
        <div className="decision-meta">
          <h2>
            Release {a.execution.release} <span className="muted">· build {a.execution.build} · {a.execution.environment}</span>
          </h2>
          <div className="risk">
            <span>Risk score</span>
            <div className="riskbar">
              <div className={`riskfill risk-${d.riskLevel}`} style={{ width: `${d.riskScore}%` }} />
            </div>
            <strong>
              {d.riskScore}/100 · {d.riskLevel}
            </strong>
          </div>
          <p className="muted small">
            {d.criteria.length - failed.length}/{d.criteria.length} release criteria passed · Policy {d.policy.name} v{d.policy.version} · Executed{' '}
            {new Date(a.execution.finishedAt).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="decision-cols">
        <div>
          <h3>Key release blockers</h3>
          {d.blockers.length ? <ul>{d.blockers.map((b) => <li key={b}>{b}</li>)}</ul> : <p className="muted">None</p>}
        </div>
        <div>
          <h3>Outstanding validation / approvals</h3>
          {d.outstandingValidations.length ? <ul>{d.outstandingValidations.map((b) => <li key={b}>{b}</li>)}</ul> : <p className="muted">None</p>}
        </div>
        <div>
          <h3>Accepted risks (waivers)</h3>
          {d.acceptedRisks.length ? <ul>{d.acceptedRisks.map((b) => <li key={b}>{b}</li>)}</ul> : <p className="muted">None</p>}
        </div>
      </div>
      <details className="explanation" open>
        <summary>AI decision explanation</summary>
        {d.explanation.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
      </details>
    </section>
  );
}
