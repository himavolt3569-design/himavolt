import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const isServerless =
    !!process.env.VERCEL || process.env.NODE_ENV === "production";
  // Pool sized so routes that fan out 3-4 queries via Promise.all (e.g. the
  // food-detail endpoint, admin stats) actually run them in parallel instead
  // of serializing on connection acquisition. 5 is comfortable for a single
  // Vercel function instance against Supabase pgbouncer; ramp up if connection
  // pressure shows up in `pg_stat_activity`.
  const adapter = new PrismaPg({
    connectionString,
    max: isServerless ? 5 : 5,
    ssl: isServerless ? { rejectUnauthorized: false } : undefined,
  });
  return new PrismaClient({ adapter });
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
