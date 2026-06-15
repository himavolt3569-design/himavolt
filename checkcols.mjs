import fs from 'node:fs';
import { PrismaClient } from './src/generated/prisma/index.js';

// Minimal .env loader (no dep) so this read-only check uses the prod DB.
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const db = new PrismaClient();
try {
  const rows = await db.$queryRawUnsafe(
    "select column_name from information_schema.columns where table_name='Restaurant' and column_name like 'print%'"
  );
  console.log('PRINT COLUMNS IN PROD DB:', JSON.stringify(rows));
  const total = await db.restaurant.count();
  console.log('TOTAL RESTAURANTS:', total);
} catch (e) {
  console.log('QUERY ERROR:', e.message);
} finally { await db.$disconnect(); }
