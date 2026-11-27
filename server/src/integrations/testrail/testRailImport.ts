import type { TestCase } from '../../domain/types';
import { formatTestRailPreconds, TestRailClient, testRailKey, type TestRailConfig } from './testRail';

export interface TestRailImportOptions {
  /** Project name or numeric id; a missing project (by name) is created. */
  project: string;
  /** Root section for the imported cases; one child section per component. */
  sectionName: string;
  suiteId?: number;
  dryRun?: boolean;
  log?: (msg: string) => void;
}

export interface TestRailImportResult {
  projectId?: number;
  /** Local key → TestRail key (`C123`) for every case that now exists in TestRail. */
  keyMap: Record<string, string>;
  created: string[];
  skipped: string[];
}

interface Project {
  id: number;
  name: string;
  suite_mode: number;
}
interface Section {
  id: number;
  name: string;
  parent_id: number | null;
}
interface Named {
  id: number;
  name: string;
  is_default?: boolean;
}

/** Creates the test cases (with separated steps) in TestRail. Idempotent: cases whose title already exists in the suite are skipped. */
export async function importTestCasesToTestRail(cases: TestCase[], cfg: TestRailConfig, opts: TestRailImportOptions): Promise<TestRailImportResult> {
  const log = opts.log ?? (() => {});
  const api = new TestRailClient(cfg);
  const result: TestRailImportResult = { keyMap: {}, created: [], skipped: [] };

  const projects = await api.list<Project>('get_projects', 'projects');
  let project = projects.find((p) => String(p.id) === opts.project || p.name.toLowerCase() === opts.project.toLowerCase());
  if (!project) {
    if (/^\d+$/.test(opts.project)) throw new Error(`TestRail project ${opts.project} not found`);
    if (opts.dryRun) {
      log(`[dry run] would create project "${opts.project}" and ${cases.length} test cases`);
      return result;
    }
    project = await api.post<Project>('add_project', { name: opts.project, suite_mode: 1 });
    log(`Created project "${project.name}" (id ${project.id})`);
  }
  result.projectId = project.id;

  let suiteId = opts.suiteId;
  if (!suiteId && project.suite_mode !== 1) suiteId = (await api.get<Named[]>(`get_suites/${project.id}`))[0]?.id;
  const scope = { suite_id: suiteId };

  const existing = new Map<string, number>();
  for (const c of await api.list<{ id: number; title: string }>(`get_cases/${project.id}`, 'cases', scope)) existing.set(c.title, c.id);
  const sections = await api.list<Section>(`get_sections/${project.id}`, 'sections', scope);
  const [priorities, types, templates] = await Promise.all([
    api.get<Named[]>('get_priorities'),
    api.get<Named[]>('get_case_types'),
    api.get<Named[]>(`get_templates/${project.id}`),
  ]);
  const templateId = templates.find((t) => /steps/i.test(t.name))?.id;
  const typeId = types.find((t) => /^automated$/i.test(t.name))?.id;

  const section = async (name: string, parentId: number | null): Promise<number | undefined> => {
    const hit = sections.find((s) => s.name === name && (s.parent_id ?? null) === parentId);
    if (hit) return hit.id;
    if (opts.dryRun) return undefined;
    const created = await api.post<Section>(`add_section/${project!.id}`, { name, suite_id: suiteId, parent_id: parentId ?? undefined });
    sections.push({ ...created, parent_id: parentId });
    log(`Created section "${name}"`);
    return created.id;
  };
  const rootId = await section(opts.sectionName, null);

  for (const tc of cases) {
    const found = existing.get(tc.name);
    if (found) {
      result.keyMap[tc.key] = testRailKey(found);
      result.skipped.push(tc.key);
      log(`${tc.key} → ${testRailKey(found)} (already in TestRail, skipped)`);
      continue;
    }
    if (opts.dryRun || rootId === undefined) {
      log(`[dry run] would create "${tc.name}" (${tc.component}, ${tc.steps.length} steps)`);
      continue;
    }
    const sectionId = (await section(tc.component || 'Unassigned', rootId))!;
    const created = await api.post<{ id: number }>(`add_case/${sectionId}`, testRailCasePayload(tc, { priorities, templateId, typeId }));
    existing.set(tc.name, created.id);
    result.keyMap[tc.key] = testRailKey(created.id);
    result.created.push(tc.key);
    log(`${tc.key} → ${testRailKey(created.id)} (created, ${tc.steps.length} steps)`);
  }
  return result;
}

export function testRailCasePayload(tc: TestCase, ctx: { priorities: Named[]; templateId?: number; typeId?: number }) {
  const priorityId = pickTestRailPriority(tc.priority, ctx.priorities);
  return {
    title: tc.name,
    ...(ctx.templateId ? { template_id: ctx.templateId } : {}),
    ...(ctx.typeId ? { type_id: ctx.typeId } : {}),
    ...(priorityId ? { priority_id: priorityId } : {}),
    custom_preconds: formatTestRailPreconds(tc),
    custom_steps_separated: tc.steps.map((s) => ({ content: s.action, expected: s.expected })),
  };
}

/** TestRail defaults: Critical, High, Medium, Low. */
export function pickTestRailPriority(priority: string, available: Named[]): number | undefined {
  const find = (n: string) => available.find((p) => p.name.toLowerCase() === n.toLowerCase())?.id;
  return find(priority) ?? (priority === 'Normal' ? find('Medium') : undefined) ?? available.find((p) => p.is_default)?.id;
}
