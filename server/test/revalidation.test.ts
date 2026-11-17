import { describe, expect, it } from 'vitest';
import type { RevalidationAdapter, RevalidationRun } from '../src/adapters/types';
import { revalidate, sameUnmetExpectation } from '../src/pipeline/revalidation';
import type { TestCase } from '../src/domain/types';

const ORIGINAL = 'Error: expect(locator).toHaveText(expected) failed\n\nLocator: locator(\'#vat\')\nExpected: "€76.00"\nReceived: "€40.00"';
const tc = { key: 'DEMO-T6', steps: [] } as unknown as TestCase;

function adapter(runs: Array<Partial<RevalidationRun> | Error>): RevalidationAdapter {
  let i = 0;
  return {
    name: 'fake',
    adapter: 'fake',
    healthCheck: async () => ({ ok: true }),
    runTestCase: async () => {
      const r = runs[i++ % runs.length];
      if (r instanceof Error) throw r;
      return { status: 'failed', durationMs: 1, errorMessage: null, stackTrace: null, attachments: [], ...r };
    },
  };
}

const target = { executionId: 'e', testCase: tc, errorMessage: ORIGINAL, stackTrace: null, originalSignature: 'x' };
const opts = { attempts: 3, similarityThreshold: 0.75 };
const MCP_FAIL = { status: 'failed' as const, errorMessage: 'Step 4 (Expected: "€76.00" is visible) failed: TimeoutError: Timeout 10000ms exceeded.' };

describe('revalidate', () => {
  it('treats the same unmet expectation from MCP as a reproduction', async () => {
    const r = await revalidate(adapter([MCP_FAIL]), target, opts);
    expect(r.status).toBe('REPRODUCED');
    expect(r.attempts[0].similarityToOriginal).toBe(0.9);
  });

  it('detects intermittent, different, not reproduced and inconclusive outcomes', async () => {
    expect((await revalidate(adapter([MCP_FAIL, { status: 'passed' }]), target, opts)).status).toBe('INTERMITTENT');
    expect((await revalidate(adapter([{ errorMessage: 'Step 1 (Navigate to /cart) failed: net::ERR_ABORTED "page"' }]), target, opts)).status).toBe('DIFFERENT_FAILURE');
    expect((await revalidate(adapter([{ status: 'passed' }]), target, opts)).status).toBe('NOT_REPRODUCED');
    expect((await revalidate(adapter([new Error('MCP down')]), target, opts)).status).toBe('INCONCLUSIVE');
  });

  it('requires every quoted value to appear in the original', () => {
    expect(sameUnmetExpectation('Expected "€76.00" and "€476.00"', ORIGINAL)).toBe(false);
    expect(sameUnmetExpectation('no quotes here', ORIGINAL)).toBe(false);
  });
});
