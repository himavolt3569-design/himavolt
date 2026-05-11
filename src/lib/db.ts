import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Retry extension for transient connection drops
const withRetry = (client: PrismaClient) => {
  return client.$extends({
    query: {
      $allOperations({ operation, args, query }) {
        return (async () => {
          const maxRetries = 3;
          let retries = 0;
          while (true) {
            try {
              return await query(args);
            } catch (error: any) {
              const isTransientError =
                error?.code === "P2024" || // Connection timeout
                error?.code === "P2010" || // Raw query failed
                error?.message?.includes("fetch failed") ||
                error?.message?.includes("Connection terminated") ||
                error?.message?.includes("read ECONNRESET");

              if (isTransientError && retries < maxRetries) {
                retries++;
                const backoff = Math.min(500 * 2 ** retries, 5000);
                console.warn(
                  `[Prisma Retry] Transient error on ${operation}, retrying in ${backoff}ms... (Attempt ${retries}/${maxRetries})`,
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

  // Slightly larger pool to handle bursts
  const pool = new Pool({
    connectionString,
    max: isServerless ? 10 : 10,
    ssl: isServerless ? { rejectUnauthorized: false } : undefined,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Wait up to 10s for a connection
  });

  // Attach pool events for debugging (optional but good for tracking drops)
  pool.on("error", (err) => {
    console.error("Unexpected error on idle database client", err);
  });

  const adapter = new PrismaPg(pool);

  // Create client, cast it, and extend it
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
