import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Assessment, type AssessmentListItem, type FailureRecord } from './api';
import { DecisionBanner } from './components/DecisionBanner';
import { HealthPanel } from './components/HealthPanel';
import { ClassificationPanel, type FailureFilter } from './components/ClassificationPanel';
import { CriteriaPanel } from './components/CriteriaPanel';
import { ValidationPanel } from './components/ValidationPanel';
import { DefectsPanel } from './components/DefectsPanel';
import { FailuresTable } from './components/FailuresTable';
import { FailureDrawer } from './components/FailureDrawer';
import { AuditFooter } from './components/AuditFooter';

export function App() {
  const [list, setList] = useState<AssessmentListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [filter, setFilter] = useState<FailureFilter>('ALL');
  const [drill, setDrill] = useState<FailureRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshList = useCallback(async (selectId?: string) => {
    const items = await api.listAssessments();
    setList(items);
    setSelectedId((cur) => selectId ?? cur ?? items[0]?.id ?? null);
  }, []);

  useEffect(() => {
    refreshList().catch((e) => setError(e.message));
    const t = setInterval(() => refreshList().catch(() => {}), 15000);
    return () => clearInterval(t);
  }, [refreshList]);

  useEffect(() => {
    if (!selectedId) return;
    api.getAssessment(selectedId).then(setAssessment).catch((e) => setError(e.message));
  }, [selectedId]);

  const rerun = async () => {
    if (!assessment) return;
    setBusy(true);
    setError(null);
    try {
      const a = await api.runAssessment(assessment.execution.executionId);
      await refreshList(a.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const latestPerExecution = useMemo(() => {
    const seen = new Set<string>();
    return list.filter((a) => (seen.has(a.executionId) ? false : (seen.add(a.executionId), true)));
  }, [list]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">◆</span>
          <div>
            <h1>Release Quality Intelligence</h1>
            <p>AI-powered automation failure triage &amp; release decision</p>
          </div>
        </div>
        <div className="controls">
          <label>
            Assessment
            <select value={selectedId ?? ''} onChange={(e) => setSelectedId(e.target.value)} data-testid="assessment-select">
              {latestPerExecution.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.build} · {a.environment} · {a.decision.replace('_', '-')}
                </option>
              ))}
              {selectedId && !latestPerExecution.some((a) => a.id === selectedId) && <option value={selectedId}>Earlier run</option>}
            </select>
          </label>
          <button className="btn" onClick={rerun} disabled={busy || !assessment}>
            {busy ? 'Re-assessing…' : 'Re-run assessment'}
          </button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}
      {!assessment ? (
        <div className="empty">{list.length ? 'Loading assessment…' : 'Waiting for the first automation execution to be assessed…'}</div>
      ) : (
        <main>
          <DecisionBanner a={assessment} />
          <div className="grid two">
            <HealthPanel a={assessment} />
            <ValidationPanel a={assessment} />
          </div>
          <ClassificationPanel a={assessment} filter={filter} onFilter={setFilter} />
          <FailuresTable a={assessment} filter={filter} onFilter={setFilter} onOpen={setDrill} />
          <div className="grid two">
            <CriteriaPanel a={assessment} />
            <DefectsPanel a={assessment} onWaiverAdded={rerun} />
          </div>
          <AuditFooter a={assessment} />
        </main>
      )}
      {drill && <FailureDrawer f={drill} onClose={() => setDrill(null)} />}
    </div>
  );
}
