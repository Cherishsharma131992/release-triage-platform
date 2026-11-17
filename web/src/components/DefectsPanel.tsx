import { useState } from 'react';
import { api, pretty, type Assessment, type DefectSummary } from '../api';

export function DefectsPanel({ a, onWaiverAdded }: { a: Assessment; onWaiverAdded: () => void }) {
  const [target, setTarget] = useState<DefectSummary | null>(null);
  return (
    <section className="card">
      <h3>Defect information</h3>
      {a.defects.length === 0 ? (
        <p className="muted">No Jira defects associated with this execution.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Jira</th>
              <th>Severity / priority</th>
              <th>Status</th>
              <th>Test case</th>
              <th>Impact</th>
              <th>Waiver</th>
            </tr>
          </thead>
          <tbody>
            {a.defects.map((d) => (
              <tr key={d.issue.key}>
                <td>
                  <a href={d.issue.url} target="_blank" rel="noreferrer" className="mono">{d.issue.key}</a>
                  <div className="muted small">{d.issue.summary}</div>
                </td>
                <td>{d.issue.severity} / {d.issue.priority}</td>
                <td>{d.issue.status}</td>
                <td className="mono small">{d.linkedTestCases.join(', ')}</td>
                <td><span className={`pill impact-${d.releaseImpact}`}>{pretty(d.releaseImpact)}</span></td>
                <td className="small">
                  {d.waiver ? (
                    <span title={d.waiver.justification}>✔ {d.waiver.approvedBy} ({d.waiver.approverRole}) until {d.waiver.expiresAt.slice(0, 10)}</span>
                  ) : d.issue.statusCategory !== 'Done' ? (
                    <button className="btn small" onClick={() => setTarget(d)}>Record waiver</button>
                  ) : (
                    <span className="muted">n/a</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {target && <WaiverForm a={a} d={target} onClose={() => setTarget(null)} onSaved={() => { setTarget(null); onWaiverAdded(); }} />}
    </section>
  );
}

function WaiverForm({ a, d, onClose, onSaved }: { a: Assessment; d: DefectSummary; onClose: () => void; onSaved: () => void }) {
  const [approvedBy, setApprovedBy] = useState('');
  const [approverRole, setApproverRole] = useState('');
  const [justification, setJustification] = useState('');
  const [expiresAt, setExpiresAt] = useState(new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10));
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    try {
      await api.addWaiver({ jiraKey: d.issue.key, release: a.execution.release, approvedBy, approverRole, justification, expiresAt: `${expiresAt}T23:59:59Z` });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Record business waiver for {d.issue.key}</h3>
        <p className="muted small">{d.issue.summary} · release {a.execution.release}</p>
        <label>Approved by<input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} /></label>
        <label>Approver role<input value={approverRole} onChange={(e) => setApproverRole(e.target.value)} placeholder="e.g. VP Product" /></label>
        <label>Justification<textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={3} /></label>
        <label>Expires<input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></label>
        {err && <div className="error">{err}</div>}
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={save}>Save &amp; re-assess</button>
        </div>
      </div>
    </div>
  );
}
