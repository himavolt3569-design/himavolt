/**
 * Runs `fn` over `items` with at most `limit` in flight at once. Uploading
 * multiple files one-at-a-time (await in a for-loop) makes a 5-photo batch
 * take 5x as long as it needs to; unlimited Promise.all risks overwhelming
 * the serverless pg.Pool (max 3 connections). A small bounded pool is the
 * middle ground — fast, without fanning out N+1 DB calls at once.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
