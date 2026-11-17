import type { Assessment } from '../api';

export type FailureFilter =
  | 'ALL'
  | 'KNOWN_OPEN_DEFECT'
  | 'NEW_WITH_JIRA'
  | 'NEW_NO_JIRA'
  | 'GENUINE'
  | 'AUTOMATION_FLAKY'
  | 'ENVIRONMENT'
  | 'TEST_DATA'
  | 'INCONCLUSIVE';

export function ClassificationPanel({ a, filter, onFilter }: { a: Assessment; filter: FailureFilter; onFilter: (f: FailureFilter) => void }) {
  const c = a.categoryCounts;
  const cards: Array<{ key: FailureFilter; label: string; value: number; tone: string }> = [
    { key: 'KNOWN_OPEN_DEFECT', label: 'Known open Jira defects', value: c.knownOpenDefects, tone: 'blue' },
    { key: 'NEW_WITH_JIRA', label: 'New failures with existing Jira', value: c.newWithJira, tone: 'blue' },
    { key: 'NEW_NO_JIRA', label: 'New failures without Jira', value: c.newWithoutJira, tone: 'slate' },
    { key: 'GENUINE', label: 'Potential genuine app defects', value: c.potentialGenuineDefects, tone: 'red' },
    { key: 'AUTOMATION_FLAKY', label: 'Automation / flaky / timing', value: c.automationOrFlaky, tone: 'amber' },
    { key: 'ENVIRONMENT', label: 'Environment / infrastructure', value: c.environment, tone: 'purple' },
    { key: 'TEST_DATA', label: 'Test data', value: c.testData, tone: 'teal' },
    { key: 'INCONCLUSIVE', label: 'Inconclusive', value: c.inconclusive, tone: 'gray' },
  ];
  return (
    <section className="card">
      <h3>Failure classification</h3>
      <div className="classgrid">
        {cards.map((card) => (
          <button
            key={card.key}
            className={`classcard tone-${card.tone} ${filter === card.key ? 'active' : ''}`}
            onClick={() => onFilter(filter === card.key ? 'ALL' : card.key)}
          >
            <span className="classval">{card.value}</span>
            <span className="classlabel">{card.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
