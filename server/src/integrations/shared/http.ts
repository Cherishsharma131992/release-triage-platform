export interface HttpClientOptions {
  baseUrl: string;
  headers: Record<string, string>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

/** Minimal JSON HTTP client with timeouts and readable errors (no secrets in messages). */
export class HttpClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: HttpClientOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  get<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T> {
    return this.request<T>('GET', path, query);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, {}, body);
  }

  private async request<T>(method: string, path: string, query: Record<string, string | number | undefined>, body?: unknown): Promise<T> {
    const url = new URL(this.opts.baseUrl.replace(/\/+$/, '') + path);
    for (const [k, v] of Object.entries(query)) if (v !== undefined) url.searchParams.set(k, String(v));
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method,
        headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...this.opts.headers },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.opts.timeoutMs ?? 20_000),
      });
    } catch (err) {
      throw new Error(`${method} ${url.origin}${url.pathname} failed: ${(err as Error).message}`);
    }
    if (!res.ok) {
      const text = (await res.text().catch(() => '')).slice(0, 300);
      throw new HttpError(res.status, `${method} ${url.origin}${url.pathname} returned HTTP ${res.status}${text ? `: ${text}` : ''}`);
    }
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}

export function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name]?.trim();
  if (!v) throw new Error(`${name} is required for the live adapter`);
  return v;
}

export const stripHtml = (s: string | null | undefined): string =>
  (s ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
