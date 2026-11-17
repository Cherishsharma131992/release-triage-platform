import path from 'path';
import { HeuristicProvider } from '../src/ai/heuristicProvider';
import { bootstrap } from '../src/bootstrap';

export const POLICY_PATH = path.join(__dirname, '..', 'config', 'release-policy.yaml');

export function testContext(mockUnavailable: string[] = []) {
  return bootstrap({ dbPath: ':memory:', policyPath: POLICY_PATH, mockUnavailable, env: {}, ai: new HeuristicProvider() });
}
