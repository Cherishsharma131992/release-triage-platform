import type { Fingerprint } from '../domain/types';
import { sha1 } from '../util/text';

const VOLATILE_PATTERNS: Array<[RegExp, string]> = [
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<uuid>'],
  [/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?Z?\b/g, '<ts>'],
  [/https?:\/\/[^\s'"]+/g, '<url>'],
  [/\b\d{1,3}(\.\d{1,3}){3}(:\d+)?\b/g, '<ip>'],
  [/\b0x[0-9a-f]+\b/gi, '<hex>'],
  [/\d+(\.\d+)?/g, '<n>'],
  [/\s+/g, ' '],
];

export function normalizeMessage(message: string): string {
  let out = message;
  for (const [pattern, replacement] of VOLATILE_PATTERNS) out = out.replace(pattern, replacement);
  return out.trim().slice(0, 400);
}

export function detectErrorType(message: string): string {
  const explicit = message.match(/^\s*([A-Z][A-Za-z]*(?:Error|Exception))\b/);
  if (explicit) return explicit[1];
  if (/expect\(|Expected[:\s]|AssertionError/.test(message)) return 'AssertionError';
  return 'Error';
}

export function extractTopFrames(stackTrace: string | null, limit = 3): string[] {
  if (!stackTrace) return [];
  return stackTrace
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('at ') && !l.includes('node_modules') && !l.includes('node:internal'))
    .map((l) =>
      l
        .replace(/^at\s+/, '')
        .replace(/:\d+:\d+\)?$/, '')
        .replace(/\(/, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .slice(0, limit);
}

export function computeFingerprint(
  testCaseKey: string | null,
  errorMessage: string | null,
  stackTrace: string | null,
): Fingerprint {
  const message = errorMessage ?? '';
  const firstLine = message.split('\n')[0];
  const normalizedMessage = normalizeMessage(message);
  const errorType = detectErrorType(firstLine);
  const topFrames = extractTopFrames(stackTrace);
  const signature = sha1([errorType, normalizedMessage, ...topFrames].join('|'));
  const fingerprint = sha1(`${testCaseKey ?? 'unmapped'}|${signature}`);
  return { signature, fingerprint, errorType, normalizedMessage, topFrames };
}
