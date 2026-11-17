import type { TestStep } from '../../domain/types';

/** One deterministic Playwright MCP tool call derived from a Zephyr step. */
export interface McpAction {
  step: number;
  description: string;
  tool: string;
  args: Record<string, unknown>;
}

const q = String.raw`"([^"]+)"`;
const lit = (s: string) => JSON.stringify(s);

/** `{getByTestId("x")}` passes a raw Playwright locator; otherwise build one from role/label/text. */
function target(kind: 'click' | 'field', raw: string, role?: string): string {
  if (raw.startsWith('{') && raw.endsWith('}')) return raw.slice(1, -1).trim();
  if (kind === 'field') return `getByLabel(${lit(raw)})`;
  if (role) return `getByRole(${lit(role.toLowerCase())}, { name: ${lit(raw)} })`;
  return `getByText(${lit(raw)}, { exact: true })`;
}

function resolveUrl(url: string, baseUrl: string | null): string {
  if (/^[a-z]+:/i.test(url)) return url;
  if (!baseUrl) throw new Error(`relative URL "${url}" needs PLAYWRIGHT_BASE_URL`);
  return new URL(url.replace(/^\/+/, ''), baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

const ref = String.raw`("[^"]+"|\{[^}]+\})`;
const unq = (s: string) => (s.startsWith('"') ? s.slice(1, -1) : s);

/**
 * Parses the supported step grammar (case-insensitive):
 *   Navigate to|Open|Go to <url|/path>
 *   Click [button|link|tab|checkbox|menuitem] "<name>" | Click {<locator>}
 *   Enter|Type "<value>" into|in "<label>"   ·   Fill "<label>" with "<value>"
 *   Select "<option>" in|from "<label>"     ·   Press <Key>     ·   Wait <n> seconds
 *   Verify|Expect|Assert [text] "<text>" [is visible|is not visible]
 * Every quoted string in the step's expected result is asserted as visible text.
 */
export function planStep(step: TestStep, baseUrl: string | null): McpAction[] {
  const action = step.action.replace(/\s*\[data:[^\]]*\]\s*$/, '').trim().replace(/\.$/, '');
  const a = (description: string, tool: string, args: Record<string, unknown>): McpAction => ({ step: step.index, description, tool, args });
  let m: RegExpExecArray | null;
  const actions: McpAction[] = [];

  if ((m = /^(?:navigate to|open|go to|visit)\s+(\S+)$/i.exec(action))) {
    actions.push(a(action, 'browser_navigate', { url: resolveUrl(m[1].replace(/^"|"$/g, ''), baseUrl) }));
  } else if ((m = new RegExp(String.raw`^(?:click|tap)(?:\s+(?:on\s+)?(?:the\s+)?(button|link|tab|checkbox|menuitem|radio))?\s+${ref}(?:\s+(?:button|link))?$`, 'i').exec(action))) {
    actions.push(a(action, 'browser_click', { element: unq(m[2]), target: target('click', unq(m[2]), m[1]) }));
  } else if ((m = new RegExp(String.raw`^(?:enter|type|input)\s+${q}\s+(?:into|in)\s+(?:the\s+)?${ref}(?:\s+field)?$`, 'i').exec(action))) {
    actions.push(a(action, 'browser_type', { element: unq(m[2]), target: target('field', unq(m[2])), text: m[1] }));
  } else if ((m = new RegExp(String.raw`^fill\s+(?:the\s+)?${ref}(?:\s+field)?\s+with\s+${q}$`, 'i').exec(action))) {
    actions.push(a(action, 'browser_type', { element: unq(m[1]), target: target('field', unq(m[1])), text: m[2] }));
  } else if ((m = new RegExp(String.raw`^select\s+${q}\s+(?:in|from)\s+(?:the\s+)?${ref}(?:\s+(?:dropdown|field))?$`, 'i').exec(action))) {
    actions.push(a(action, 'browser_select_option', { element: unq(m[2]), target: target('field', unq(m[2])), values: [m[1]] }));
  } else if ((m = /^press\s+(?:the\s+)?"?([\w+]+)"?(?:\s+key)?$/i.exec(action))) {
    actions.push(a(action, 'browser_press_key', { key: m[1] }));
  } else if ((m = /^wait\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:s|sec|secs|seconds?)$/i.exec(action))) {
    actions.push(a(action, 'browser_wait_for', { time: Math.min(30, Number(m[1])) }));
  } else if ((m = new RegExp(String.raw`^(?:verify|expect|assert|check)(?:\s+(?:that\s+)?(?:the\s+)?text)?\s+${q}(\s+is\s+(?:not\s+visible|gone|hidden))?(?:\s+is\s+(?:visible|shown|displayed))?$`, 'i').exec(action))) {
    actions.push(a(action, 'browser_wait_for', m[2] ? { textGone: m[1], time: 10 } : { text: m[1], time: 10 }));
  } else {
    throw new Error(`Step ${step.index} is not in the automatable step format: "${step.action}"`);
  }

  for (const text of step.expected.matchAll(/"([^"]+)"/g)) {
    actions.push(a(`Expected: "${text[1]}" is visible`, 'browser_wait_for', { text: text[1], time: 10 }));
  }
  return actions;
}

export function planTestCase(steps: TestStep[], baseUrl: string | null): McpAction[] {
  if (!steps.length) throw new Error('Test case has no steps to execute');
  return steps.flatMap((s) => planStep(s, baseUrl));
}
