import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['query', 'info', 'warn', 'error'] });

async function repair() {
  console.log("--- Starting ownership repair ---");

  // 1. Find all restaurants
  const restaurants = await prisma.restaurant.findMany();
  console.log(`Checking ${restaurants.length} restaurants...`);

  for (const rest of restaurants) {
    // Check if owner exists
    const owner = await prisma.user.findUnique({ where: { id: rest.ownerId } });
    
    if (!owner) {
      console.log(`[ORPHANED] Restaurant "${rest.name}" (ID: ${rest.id}) has missing ownerId: ${rest.ownerId}`);
      
      // Try to find the correct owner by email? 
      // Wait, we don't have the owner's email in the restaurant table.
      // But we might find a user whose email matches what the owner *used* to have.
      // This is hard without a log.
      
      // ALTERNATIVE: Look for users who have NO restaurants but should be owners.
      // Or just look for the user with the most common email prefix? No.
    } else {
      console.log(`[OK] Restaurant "${rest.name}" linked to ${owner.email}`);
    }
  }

  // 2. Find all users and check their roles
  const users = await prisma.user.findMany();
  for (const user of users) {
    const restCount = await prisma.restaurant.count({ where: { ownerId: user.id } });
    if (restCount > 0 && user.role !== "OWNER") {
      console.log(`[UPGRADE] User ${user.email} owns ${restCount} restaurants but role is ${user.role}. Upgrading to OWNER.`);
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "OWNER" }
      });
    }
  }

  console.log("--- Repair complete ---");
}

repair()
  .catch(console.error)
  .finally(() => prisma.$disconnect().then(() => pool.end()));
