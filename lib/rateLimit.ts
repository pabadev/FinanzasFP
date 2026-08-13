const store = new Map<string, number[]>();

export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - windowMs;

  const hits = (store.get(key) ?? []).filter((t) => t > windowStart);

  if (hits.length >= max) {
    store.set(key, hits);
    return false;
  }

  hits.push(now);
  store.set(key, hits);
  return true;
}
