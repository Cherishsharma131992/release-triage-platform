import { api, pct, pretty, type Attachment, type FailureRecord } from '../api';

function Evidence({ items }: { items: Attachment[] }) {
  if (!items.length) return <p className="muted small">No attachments.</p>;
  return (
    <div className="evidence">
      {items.map((a) =>
        a.kind === 'screenshot' ? (
          <a key={a.id} href={api.artifactUrl(a.id)} target="_blank" rel="noreferrer" className="thumb">
            <img src={api.artifactUrl(a.id)} alt={a.name} />
            <span>{a.name}</span>
          </a>
        ) : (
          <a key={a.id} href={api.artifactUrl(a.id)} target="_blank" rel="noreferrer" className="pill link">{a.kind === 'trace' ? '🧭' : '📄'} {a.name}</a>
        ),
      )}
    </div>
  );
}

export function FailureDrawer({ f, onClose }: { f: FailureRecord; onClose: () => void }) {
  const ai = f.finalAnalysis;
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()} data-testid="failure-drawer">
        <div className="drawer-head">
          <div>
            <div className="mono small">{f.testCaseKey} · {f.component}</div>
            <h2>{f.testName}</h2>
            <div className="pills">
              <span className={`pill cat-${f.category}`}>{pretty(f.category)}</span>
              <span className={`pill cls-${ai.classification}`}>{pretty(ai.classification)} · {pct(ai.confidence)}</span>
              <span className={`pill impact-${f.releaseImpact}`}>Impact: {pretty(f.releaseImpact)}</span>
              {f.businessCritical && <span className="pill crit">business-critical</span>}
            </div>
          </div>
          <button className="btn ghost" onClick={onClose}>✕</button>
        </div>

        <h4>Root-cause assessment</h4>
        <p>{ai.rootCause}</p>
        <h4>Recommended next action</h4>
        <p><strong>{ai.recommendedAction}</strong></p>
        <h4>Reasoning</h4>
        <ul>{ai.reasoning.map((r, i) => <li key={i}>{r}</li>)}</ul>
        {ai.signals.length > 0 && (<><h4>Evidence signals</h4><ul className="small">{ai.signals.map((s) => <li key={s}>{s}</li>)}</ul></>)}
        <p className="muted small">
          Initial classification: {pretty(f.initialAnalysis.classification)} ({pct(f.initialAnalysis.confidence)}) · analysed by {ai.analyzedBy.provider}/{ai.analyzedBy.model} v{ai.analyzedBy.version} at {new Date(ai.analyzedAt).toLocaleString()}
        </p>

        <h4>Matching Jira defect</h4>
        {f.jira ? (
          <div className="box">
            <a href={f.jira.issue.url} target="_blank" rel="noreferrer" className="mono">{f.jira.issue.key}</a> — {f.jira.issue.summary}
            <div className="muted small">{f.jira.issue.severity} / {f.jira.issue.priority} · {f.jira.issue.status} · match {pretty(f.jira.method)} ({f.jira.score})</div>
            <ul className="small">{f.jira.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            {f.waiver && <div className="small">Waiver {f.waiver.id}: {f.waiver.approvedBy} ({f.waiver.approverRole}) — {f.waiver.justification}</div>}
          </div>
        ) : <p className="muted">No matching Jira defect.</p>}

        <h4>Historical comparison</h4>
        {f.history.matches.length ? (
          <>
            <p className="small">Seen {f.history.occurrences}× before{f.history.firstSeenRelease ? ` (first ${f.history.firstSeenRelease}, last ${f.history.lastSeenRelease})` : ''}.</p>
            <table className="table small">
              <thead><tr><th>Build</th><th>Match</th><th>Similarity</th><th>Jira</th><th>Classification</th></tr></thead>
              <tbody>
                {f.history.matches.map((m, i) => (
                  <tr key={i}><td>{m.build}</td><td>{pretty(m.matchType)}{m.testCaseKey !== f.testCaseKey ? ` (${m.testCaseKey})` : ''}</td><td>{m.similarity}</td><td>{m.jiraKey ?? '—'}</td><td>{m.classification ? pretty(m.classification) : '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        ) : <p className="muted small">No previous occurrence.</p>}

        <h4>Original execution</h4>
        <pre className="code">{f.errorMessage}</pre>
        <details><summary className="small">Stack trace · fingerprint {f.fingerprint.fingerprint}</summary><pre className="code">{f.stackTrace}</pre></details>
        <Evidence items={f.attachments} />

        <h4>Playwright MCP re-execution — {pretty(f.validation.status)}</h4>
        <p className="small">{f.validation.summary}</p>
        {f.validation.attempts.map((at) => (
          <div key={at.attempt} className={`attempt attempt-${at.status}`}>
            <div className="small"><strong>Attempt {at.attempt}</strong> · {at.status.toUpperCase()} · {(at.durationMs / 1000).toFixed(1)}s{at.similarityToOriginal !== null ? ` · similarity to original ${at.similarityToOriginal}` : ''}</div>
            {at.errorMessage && <pre className="code small">{at.errorMessage}</pre>}
            <Evidence items={at.attachments} />
          </div>
        ))}
      </aside>
    </div>
  );
}
