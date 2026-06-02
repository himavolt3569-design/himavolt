import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
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

  // Serverless + PgBouncer (transaction mode) pattern:
  // each Lambda processes one request at a time, so it only needs ONE
  // connection. Capping at 1 prevents N concurrent Lambdas × 10 connections
  // from exhausting Supabase's shared pooler. Local dev gets a small pool
  // for parallel queries during development.
  const pool = new Pool({
    connectionString,
    max: isServerless ? 1 : 5,
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
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb();
    return (client as unknown as Record<string | symbol, unknown>)[prop];
  },
});
