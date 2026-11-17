import { describe, expect, it } from 'vitest';
import { HeuristicProvider } from '../src/ai/heuristicProvider';
import type { FailureAnalysisInput } from '../src/ai/provider';

const input = (errorMessage: string) =>
  ({ errorMessage, stackTrace: null, jira: null, category: 'NEW_NO_JIRA', history: { seenBefore: false, occurrences: 0, firstSeenRelease: null, lastSeenRelease: null, previousClassifications: {} } }) as unknown as FailureAnalysisInput;

const PW = (received: string) =>
  `Error: expect(locator).toHaveText(expected) failed\n\nLocator: locator('#x')\nExpected: "€76.00"\nReceived: "${received}"\nTimeout: 3000ms\n\nCall log:\n  - waiting for locator('#x')`;

describe('heuristic classification of Playwright assertion errors', () => {
  const ai = new HeuristicProvider();
  it('treats a wrong rendered value as an application defect', async () => {
    expect((await ai.classifyFailure(input(PW('€40.00')))).classification).toBe('APPLICATION_DEFECT');
  });
  it('treats a captured loading state as timing', async () => {
    expect((await ai.classifyFailure(input(PW('Loading recommendations…')))).classification).toBe('TIMING_SYNC');
  });
  it('reclassifies a timing failure that reproduces on every re-run', async () => {
    const initial = await ai.classifyFailure(input('TimeoutError: Timeout 5000ms exceeded waiting for locator'));
    const final = await ai.assessValidation({ initial, validation: { eligible: true, status: 'REPRODUCED', attempts: [], summary: 'reproduced 3/3' } } as never);
    expect(final.classification).toBe('APPLICATION_DEFECT');
  });
});
