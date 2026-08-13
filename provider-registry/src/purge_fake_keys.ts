import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.join(__dirname, '../../.env'), 'utf-8');
const match = envContent.match(/DATABASE_URL=(.+)/);
const dbUrl = match ? match[1].trim() : process.env.DATABASE_URL;

async function main() {
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const purgeRes = await pool.query(
      "DELETE FROM api_key_pool WHERE key_secret LIKE '%LiveTestKey%' OR key_secret LIKE '%hg_live_%' OR id LIKE 'heygen-key%'"
    );
    console.log('Purged fake dummy keys count from Neon DB:', purgeRes.rowCount);

    const listRes = await pool.query('SELECT id, provider, key_name, masked_key, status FROM api_key_pool');
    console.log('REMAINING REAL KEYS IN NEON DB POOL:', JSON.stringify(listRes.rows, null, 2));
  } catch (err) {
    console.error('Error purging fake keys:', err);
  } finally {
    await pool.end();
  }
}

main();
