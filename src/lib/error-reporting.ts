// Lightweight client-side error reporting hook. Logs to the console today; swap
// in a real telemetry sink here (e.g. Sentry) if/when one is adopted.
export function reportClientError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  console.error("[client-error]", error, {
    route: window.location.pathname,
    ...context,
  });
}
