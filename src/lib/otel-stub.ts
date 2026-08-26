/** Turbopack cannot ignore Supabase’s optional `@opentelemetry/api` import. */
export const diag = { setLogger() {} };
export const context = {
  active: () => undefined,
  with: (_ctx: unknown, fn: () => unknown) => fn(),
};
export const trace = {
  getTracer: () => ({
    startSpan: () => ({
      end() {},
      setAttribute() {},
      setStatus() {},
      recordException() {},
    }),
    startActiveSpan: (_name: string, fn: (span: { end(): void }) => unknown) =>
      fn({ end() {} }),
  }),
};
export const SpanStatusCode = { UNSET: 0, OK: 1, ERROR: 2 };
const otelStub = { diag, context, trace, SpanStatusCode };
export default otelStub;
