import { decisionLabel, type Assessment } from '../api';

export function CriteriaPanel({ a }: { a: Assessment }) {
  return (
    <section className="card">
      <h3>Mandatory release criteria</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Rule</th>
            <th>Criterion</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {a.decision.criteria.map((c) => (
            <tr key={c.ruleId}>
              <td className="mono">{c.ruleId}</td>
              <td>
                <div>{c.name}</div>
                <div className="muted small">{c.details}</div>
                {!c.passed && c.evidence.length > 0 && (
                  <ul className="small">{c.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
                )}
              </td>
              <td>
                {c.passed ? <span className="pill ok">PASS</span> : <span className={`pill fail-${c.outcomeIfFailed}`}>FAIL → {decisionLabel(c.outcomeIfFailed)}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
