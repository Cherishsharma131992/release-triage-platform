import type { TestCase } from '../../domain/types';
import type { HealthCheckResult, TestCaseManagementAdapter } from '../types';
import { fileHealth, readJsonArray } from '../shared/jsonFile';

/** Test cases from a JSON export (platform TestCase shape). Re-read on every call so edits apply immediately. */
export class FileTestCaseAdapter implements TestCaseManagementAdapter {
  readonly name = 'Zephyr (file export)';
  readonly adapter = 'file-zephyr';

  constructor(private readonly file: string) {}

  async healthCheck(): Promise<HealthCheckResult> {
    return fileHealth(this.file);
  }

  async getTestCases(keys: string[]): Promise<TestCase[]> {
    const wanted = new Set(keys);
    return readJsonArray<TestCase>(this.file).filter((tc) => wanted.has(tc.key));
  }
}
