import { createHash } from 'crypto';

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'in', 'is', 'it', 'its',
  'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'were', 'when', 'with', 'will', 'not', 'but',
  'expect', 'expected', 'received', 'error', 'should', 'after', 'into', 'than', 'then', 'test', 'n',
]);

export function sha1(input: string, length = 16): string {
  return createHash('sha1').update(input).digest('hex').slice(0, length);
}

function stem(token: string): string {
  if (token.length > 5 && token.endsWith('ing')) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith('ed')) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith('es')) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/<[a-z]+>/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
    .map(stem);
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

/** Cosine similarity of term-frequency vectors, in [0, 1]. */
export function textSimilarity(a: string, b: string): number {
  const ta = termFrequency(tokenize(a));
  const tb = termFrequency(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let dot = 0;
  for (const [term, count] of ta) dot += count * (tb.get(term) ?? 0);
  const norm = (m: Map<string, number>) => Math.sqrt([...m.values()].reduce((s, v) => s + v * v, 0));
  return dot / (norm(ta) * norm(tb));
}

export function round(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
