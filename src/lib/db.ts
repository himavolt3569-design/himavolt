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
  // In serverless environments (Vercel) each function instance has its own
  // connection pool. Limit to 1-2 connections to avoid exhausting Supabase limits.
  const isServerless =
    !!process.env.VERCEL || process.env.NODE_ENV === "production";
  const adapter = new PrismaPg({
    connectionString,
    max: 2, // keep low in all environments — Supabase Session mode pool is limited
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
