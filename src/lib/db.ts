import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma_v3: PrismaClient | undefined;
};

// Retry only true transient drops. Aggressive retries amplify pool-saturation
// outages — keep it tight.
const withRetry = (client: PrismaClient) => {
  return client.$extends({
    query: {
      $allOperations({ operation, args, query }) {
        return (async () => {
          const maxRetries = 2;
          let retries = 0;
          while (true) {
            try {
              return await query(args);
            } catch (error: any) {
              const isTransientError =
                error?.code === "P2024" ||
                error?.code === "P2010" ||
                error?.message?.includes("fetch failed") ||
                error?.message?.includes("Connection terminated") ||
                error?.message?.includes("read ECONNRESET");

              if (isTransientError && retries < maxRetries) {
                retries++;
                const backoff = Math.min(200 * 2 ** retries, 1500);
                console.warn(
                  `[Prisma Retry] ${operation} (${error?.code ?? "ECONN"}) retrying in ${backoff}ms (${retries}/${maxRetries})`,
                );
                await new Promise((resolve) => setTimeout(resolve, backoff));
                continue;
              }
              throw error;
            }
          }
        })();
      },
    },
  });
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const isServerless =
    !!process.env.VERCEL || process.env.NODE_ENV === "production";

  // Serverless against Supabase's transaction-mode pooler (Supavisor, port
  // 6543): the pooler multiplexes many short-lived client connections, so a
  // small per-Lambda pool is safe AND lets a single request's queries overlap
  // instead of serializing one-at-a-time. max:1 was over-conservative and made
  // every multi-query request pay its queries back-to-back; 3 is the sweet spot
  // (total backend conns ≈ concurrent_lambdas × 3, well within the pooler's
  // client limit). Local dev keeps a slightly larger pool.
  const pool = new Pool({
    connectionString,
    max: isServerless ? 3 : 5,
    ssl: isServerless ? { rejectUnauthorized: false } : undefined,
    // Recycle idle conns fast so other warm Lambdas can claim them.
    idleTimeoutMillis: isServerless ? 10000 : 30000,
    // Fail fast under saturation instead of holding the HTTP request open
    // (which makes the saturation worse).
    connectionTimeoutMillis: 3000,
    // Hard ceiling on any single query — runaway queries can't hog a slot.
    statement_timeout: 15000,
    query_timeout: 15000,
    // Keep the TCP connection healthy through long-lived SSE handlers.
    keepAlive: true,
  });

  pool.on("error", (err) => {
    console.error("[pg.Pool] idle client error:", err.message);
  });

  const adapter = new PrismaPg(pool);

  const baseClient = new PrismaClient({ adapter });
  return withRetry(baseClient) as unknown as PrismaClient;
}

export function getDb() {
  if (!globalForPrisma.prisma_v3) {
    globalForPrisma.prisma_v3 = createPrismaClient();
  }
  return globalForPrisma.prisma_v3;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb();
    return (client as unknown as Record<string | symbol, unknown>)[prop];
  },
});
