type Level = "debug" | "info" | "warn" | "error";

export type Logger = {
  [L in Level]: (msg: string, fields?: Record<string, unknown>) => void;
} & { child: (fields: Record<string, unknown>) => Logger };

function make(base: Record<string, unknown>): Logger {
  const write = (level: Level) => (msg: string, fields?: Record<string, unknown>) => {
    const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...base, ...fields });
    if (level === "error" || level === "warn") console.error(line);
    else console.log(line);
  };
  return {
    debug: write("debug"),
    info: write("info"),
    warn: write("warn"),
    error: write("error"),
    child: (fields) => make({ ...base, ...fields }),
  };
}

/** Structured JSON logger. The only place app code may write to stdout. */
export const log = make({});
