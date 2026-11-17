import { describe, expect, it } from 'vitest';
import { computeFingerprint, normalizeMessage } from '../src/pipeline/fingerprint';

describe('fingerprint', () => {
  it('normalizes volatile values', () => {
    expect(normalizeMessage('Timeout 30000ms at 2026-11-10T06:00:00Z id 7f3e2b1c-55aa-4e0b-9c1d-2a6b8e9f0d11 host 10.0.4.17:8443')).toBe(
      'Timeout <n>ms at <ts> id <uuid> host <ip>',
    );
  });

  it('is stable across volatile differences and differs across tests', () => {
    const trace = '    at Page.do (/a/tests/x.spec.ts:10:5)\n    at /a/node_modules/x.js:1:1';
    const a = computeFingerprint('T1', 'TimeoutError: Timeout 30000ms exceeded', trace);
    const b = computeFingerprint('T1', 'TimeoutError: Timeout 45000ms exceeded', trace.replace('10:5', '12:9'));
    const c = computeFingerprint('T2', 'TimeoutError: Timeout 30000ms exceeded', trace);
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.signature).toBe(c.signature);
    expect(a.fingerprint).not.toBe(c.fingerprint);
    expect(a.errorType).toBe('TimeoutError');
    expect(a.topFrames).toEqual(['Page.do /a/tests/x.spec.ts']);
  });
});
