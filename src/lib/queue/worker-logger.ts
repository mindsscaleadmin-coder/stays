/** Minimal logger for the standalone worker process (no Next.js). */
export const logger = {
  info: (message: string, fields?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: "info", message, ...fields, ts: new Date().toISOString() }));
  },
  warn: (message: string, fields?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: "warn", message, ...fields, ts: new Date().toISOString() }));
  },
  error: (message: string, fields?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: "error", message, ...fields, ts: new Date().toISOString() }));
  },
};
