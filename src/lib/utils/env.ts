export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSemanticThreshold(): number {
  const raw = process.env.SEMANTIC_THRESHOLD;
  const parsed = raw ? Number(raw) : 0.78;
  return Number.isFinite(parsed) ? parsed : 0.78;
}
