import type { Assessment } from '../api';

export function AuditFooter({ a }: { a: Assessment }) {
  const au = a.audit;
  return (
    <footer className="audit">
      Assessment <span className="mono">{a.id}</span> · AI model {au.model.provider}/{au.model.model} v{au.model.version} · Policy {au.policy.name} v{au.policy.version} (hash{' '}
      <span className="mono">{au.policy.hash}</span>) · Analysed {new Date(au.analysisCompletedAt).toLocaleString()} in {au.durationMs} ms · Platform v{au.platformVersion}
    </footer>
  );
}
