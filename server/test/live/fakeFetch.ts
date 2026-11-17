export interface Call {
  url: URL;
  headers: Record<string, string>;
}

/** Routes requests by pathname to canned JSON responses; unmatched paths return 404. */
export function fakeFetch(routes: Record<string, (url: URL) => unknown>) {
  const calls: Call[] = [];
  const impl = (async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const route = Object.keys(routes).find((p) => url.pathname.endsWith(p));
    if (!route) return new Response(JSON.stringify({ message: 'not found' }), { status: 404 });
    return new Response(JSON.stringify(routes[route](url)), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { impl, calls };
}
