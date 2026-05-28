/** Agent debug (session 9e4a7a) — usuń po weryfikacji. */
export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
): void {
  // #region agent log
  fetch('http://127.0.0.1:7440/ingest/0d678d3a-7dc4-4153-b52b-ba4140534c07', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '9e4a7a',
    },
    body: JSON.stringify({
      sessionId: '9e4a7a',
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}
