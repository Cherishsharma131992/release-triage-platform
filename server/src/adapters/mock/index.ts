import type { ArtifactSink } from '../../store/store';
import type { Adapters } from '../types';
import { MockAllureAdapter } from './mockAllure';
import { MockJiraAdapter } from './mockJira';
import { MockPlaywrightMcpAdapter } from './mockPlaywrightMcp';
import { MockZephyrAdapter } from './mockZephyr';

/** `unavailable` lists integrations to simulate as down: allure, zephyr, jira, playwright. */
export function createMockAdapters(artifacts: ArtifactSink, unavailable: string[] = []): Adapters {
  const up = (n: string) => !unavailable.includes(n);
  return {
    results: new MockAllureAdapter(artifacts, up('allure')),
    testCases: new MockZephyrAdapter(up('zephyr')),
    defects: new MockJiraAdapter(up('jira')),
    revalidation: new MockPlaywrightMcpAdapter(artifacts, up('playwright')),
  };
}
