import { pct, pretty, type Assessment, type FailureRecord } from '../api';
import type { FailureFilter } from './ClassificationPanel';

const matches = (f: FailureRecord, filter: FailureFilter) => {
  const c = f.finalAnalysis.classification;
  switch (filter) {
    case 'ALL': return true;
    case 'GENUINE': return f.potentialGenuineDefect;
    case 'AUTOMATION_FLAKY': return f.category === 'NEW_NO_JIRA' && ['AUTOMATION_SCRIPT', 'FLAKY', 'TIMING_SYNC'].includes(c);
    case 'ENVIRONMENT': case 'TEST_DATA': case 'INCONCLUSIVE': return f.category === 'NEW_NO_JIRA' && c === filter;
    default: return f.category === filter;
  }
};

const impactRank = { BLOCKING: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export function FailuresTable({ a, filter, onFilter, onOpen }: { a: Assessment; filter: FailureFilter; onFilter: (f: FailureFilter) => void; onOpen: (f: FailureRecord) => void }) {
  const rows = a.failures.filter((f) => matches(f, filter)).sort((x, y) => impactRank[x.releaseImpact] - impactRank[y.releaseImpact]);
  return (
    <section className="card">
      <div className="card-head">
        <h3>Failures ({rows.length}{filter !== 'ALL' ? ` of ${a.failures.length}` : ''})</h3>
        {filter !== 'ALL' && <button className="btn ghost small" onClick={() => onFilter('ALL')}>Clear filter: {pretty(filter)}</button>}
      </div>
      <table className="table failures" data-testid="failures-table">
        <thead>
          <tr>
            <th>Test case</th>
            <th>Category</th>
            <th>AI classification</th>
            <th>Jira</th>
            <th>Re-validation</th>
            <th>Impact</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => (
            <tr key={f.id} onClick={() => onOpen(f)} className="clickable">
              <td>
                <div className="mono small">{f.testCaseKey}</div>
                <div>{f.testName}{f.businessCritical && <span className="pill crit">business-critical</span>}</div>
                <div className="muted small">{f.component} · {pretty(f.recurrence)}</div>
              </td>
              <td><span className={`pill cat-${f.category}`}>{pretty(f.category)}</span></td>
              <td>
                <span className={`pill cls-${f.finalAnalysis.classification}`}>{pretty(f.finalAnalysis.classification)}</span>
                <div className="muted small">confidence {pct(f.finalAnalysis.confidence)}</div>
              </td>
              <td className="small">{f.jira ? <><span className="mono">{f.jira.issue.key}</span><div className="muted">{f.jira.issue.severity} · {f.jira.issue.status}</div></> : <span className="muted">—</span>}</td>
              <td className="small">{pretty(f.validation.status)}</td>
              <td><span className={`pill impact-${f.releaseImpact}`}>{pretty(f.releaseImpact)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
