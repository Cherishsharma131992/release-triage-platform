import type { TestCase } from '../../domain/types';
import type { HealthCheckResult, TestCaseManagementAdapter } from '../types';
import { TEST_CASES } from './data/testCases';

export class MockZephyrAdapter implements TestCaseManagementAdapter {
  readonly name = 'Test Case Management (Zephyr Scale)';
  readonly adapter = 'mock-zephyr';

  constructor(private readonly available = true) {}

  async healthCheck(): Promise<HealthCheckResult> {
    return this.available ? { ok: true } : { ok: false, message: 'Zephyr Scale API unreachable (mock outage)' };
  }

  async getTestCases(keys: string[]): Promise<TestCase[]> {
    if (!this.available) throw new Error('Zephyr Scale API unreachable (mock outage)');
    const wanted = new Set(keys);
    return TEST_CASES.filter((tc) => wanted.has(tc.key));
  }
}
