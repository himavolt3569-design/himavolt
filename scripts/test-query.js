const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query("SELECT id, email, name, username, phone, \"imageUrl\", role, is_deleted, is_blacklisted, \"createdAt\", \"updatedAt\" FROM public.users LIMIT 1");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
