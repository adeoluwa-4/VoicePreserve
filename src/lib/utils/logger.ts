type Level = "info" | "warn" | "error";

export function log(level: Level, message: string, meta: Record<string, unknown> = {}): void {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  };
  console.log(JSON.stringify(payload));
}
