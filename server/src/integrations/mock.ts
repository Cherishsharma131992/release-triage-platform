import type { ArtifactSink } from '../store/store';
import type { Adapters } from './types';
import { MockAllureAdapter } from './allure/mockAllure';
import path from 'path';
import { FileDefectAdapter } from './jira/fileJira';
import { MockPlaywrightMcpAdapter } from './playwright-mcp/mockPlaywrightMcp';
import { MockZephyrAdapter } from './zephyr/mockZephyr';

/** `unavailable` lists integrations to simulate as down: allure, zephyr, jira, playwright. */
export function createMockAdapters(artifacts: ArtifactSink, unavailable: string[] = []): Adapters {
  const up = (n: string) => !unavailable.includes(n);
  return {
    results: new MockAllureAdapter(artifacts, up('allure')),
    testCases: new MockZephyrAdapter(up('zephyr')),
    // Mock mode reads the bundled Jira seed through the file adapter (no separate mock Jira adapter).
    defects: new FileDefectAdapter(path.resolve(__dirname, '../../data-seeds/jira-issues.json'), up('jira')),
    revalidation: new MockPlaywrightMcpAdapter(artifacts, up('playwright')),
  };
}
