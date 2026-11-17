import fs from 'fs';
import { describe, expect, it } from 'vitest';
import { parsePolicy } from '../src/policy/policy';
import { POLICY_PATH } from './helpers';

describe('policy loader', () => {
  it('loads and hashes the default policy', () => {
    const p = parsePolicy(fs.readFileSync(POLICY_PATH, 'utf8'));
    expect(p.rules).toHaveLength(9);
    expect(p.hash).toHaveLength(12);
  });

  it('rejects unknown checks', () => {
    const bad = fs.readFileSync(POLICY_PATH, 'utf8').replace('check: min-pass-rate', 'check: vibes');
    expect(() => parsePolicy(bad)).toThrow();
  });
});
