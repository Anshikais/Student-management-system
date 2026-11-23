import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Pool } = pg;

async function runSeed() {
  const pool = process.env.DATABASE_URL 
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'joineazy_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      });

  try {
    console.log('Connecting to PostgreSQL for seeding...');
    const seedPath = path.join(__dirname, 'seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log('Executing seed.sql...');
    await pool.query(seedSql);
    console.log('✅ PostgreSQL Database successfully seeded with demo users, groups, assignments and submissions!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSeed();