function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] as string);
}

/** Renders a placeholder "screenshot" so evidence can be drilled into without a real browser. */
export function renderScreenshotSvg(title: string, subtitle: string, message: string, ok: boolean): string {
  const lines = message.split('\n').slice(0, 6).map((l) => escapeXml(l.slice(0, 90)));
  const accent = ok ? '#16a34a' : '#dc2626';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <rect width="960" height="48" fill="#0f172a"/>
  <circle cx="24" cy="24" r="6" fill="#ef4444"/><circle cx="44" cy="24" r="6" fill="#f59e0b"/><circle cx="64" cy="24" r="6" fill="#22c55e"/>
  <rect x="96" y="12" width="760" height="24" rx="12" fill="#1e293b"/>
  <text x="112" y="29" fill="#94a3b8" font-family="monospace" font-size="13">https://staging.shop.example.com</text>
  <text x="40" y="100" fill="#0f172a" font-family="sans-serif" font-size="26" font-weight="700">${escapeXml(title)}</text>
  <text x="40" y="132" fill="#475569" font-family="sans-serif" font-size="16">${escapeXml(subtitle)}</text>
  <rect x="40" y="160" width="880" height="${40 + lines.length * 24}" rx="8" fill="#fff" stroke="${accent}" stroke-width="2"/>
  ${lines.map((l, i) => `<text x="60" y="${195 + i * 24}" fill="${accent}" font-family="monospace" font-size="15">${l}</text>`).join('\n  ')}
</svg>`;
}

export function renderTrace(testName: string, steps: string[], failedAt: number | null): string {
  return JSON.stringify(
    {
      format: 'playwright-trace-summary/v1',
      test: testName,
      actions: steps.map((s, i) => ({
        index: i + 1,
        action: s,
        status: failedAt !== null && i + 1 === failedAt ? 'failed' : failedAt !== null && i + 1 > failedAt ? 'skipped' : 'passed',
      })),
    },
    null,
    2,
  );
}
