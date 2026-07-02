import crypto from "crypto";
import { db } from "./db";

/**
 * Generate a unique username from a seed (name or email local-part), so new
 * accounts never have to pick one during sign-up. Mirrors the sequential
 * retry pattern used for restaurant codes (generateUniqueCode in
 * src/app/api/restaurants/route.ts).
 */
export async function generateUniqueUsername(seed: string): Promise<string> {
  const base =
    seed
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "")
      .slice(0, 14) || "user";

  const bare = base.length >= 3 ? base : `${base}user`.slice(0, 14);
  if (!(await db.user.findUnique({ where: { username: bare } }))) {
    return bare;
  }

  for (let i = 0; i < 8; i++) {
    const suffix = crypto.randomInt(1000, 9999).toString();
    const candidate = `${base.slice(0, 20 - suffix.length)}${suffix}`;
    if (!(await db.user.findUnique({ where: { username: candidate } }))) {
      return candidate;
    }
  }

  return `user${Date.now().toString(36)}`;
}
