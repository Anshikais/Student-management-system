import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_PATH = path.join(__dirname, '..', 'database', 'schema.sql');
const SEED_PATH = path.join(__dirname, '..', 'database', 'seed.sql');

let activePool = null;
let initPromise = null;

// Describes where we are connecting (never prints the password)
const getTargetDescription = () => {
  if (process.env.DATABASE_URL) {
    try {
      const u = new URL(process.env.DATABASE_URL.trim());
      return `Host: ${u.hostname}, Port: ${u.port || 5432}, Database: ${u.pathname.replace('/', '')}, User: ${decodeURIComponent(u.username)}`;
    } catch {
      return 'DATABASE_URL is set but is not a valid URL (check for quotes, spaces or unencoded special characters in the password)';
    }
  }
  return `Host: ${process.env.DB_HOST || '127.0.0.1'}, Port: ${process.env.DB_PORT || 5432}, Database: ${process.env.DB_NAME || 'joineazy_db'}, User: ${process.env.DB_USER || 'postgres'}`;
};

// Decide whether SSL is needed
const shouldUseSsl = () => {
  if (process.env.DB_SSL === 'true') return true;
  if (process.env.DB_SSL === 'false') return false;
  // Render's external hostnames end in .render.com and require SSL.
  // Internal hostnames (dpg-xxxx-a) do not.
  if (process.env.DATABASE_URL) {
    try {
      return new URL(process.env.DATABASE_URL.trim()).hostname.endsWith('.render.com');
    } catch {
      return false;
    }
  }
  return false;
};

// Real PostgreSQL Pool Configuration
const createRealPool = () => {
  const commonOptions = {
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000
  };

  let pool;
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL.trim(),
      ssl: shouldUseSsl() ? { rejectUnauthorized: false } : false,
      ...commonOptions
    });
  } else {
    pool = new Pool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'joineazy_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: shouldUseSsl() ? { rejectUnauthorized: false } : false,
      ...commonOptions
    });
  }

  // Prevent an idle-client error from crashing the whole process
  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err.message);
  });

  return pool;
};

// Creates tables and seed data if the database is empty
const ensureSchema = async (pool) => {
  const { rows } = await pool.query(`SELECT to_regclass('public.users') AS t`);
  if (rows[0].t) {
    console.log('✅ Database schema already exists');
    return;
  }

  console.log('📦 Empty database detected, applying schema...');

  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error(`schema.sql not found at ${SCHEMA_PATH}`);
  }
  await pool.query(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  console.log('   ✔ schema.sql applied');

  if (fs.existsSync(SEED_PATH)) {
    await pool.query(fs.readFileSync(SEED_PATH, 'utf8'));
    console.log('   ✔ seed.sql applied');
  } else {
    console.warn('   ⚠ seed.sql not found, demo users were not created');
  }
};

export const initDb = async () => {
  if (activePool) return activePool;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Explicit mock DB flag only for isolated unit tests
    if (process.env.USE_MOCK_DB === 'true') {
      console.log('🧪 USE_MOCK_DB=true: Using in-memory pg-mem database for isolated testing.');
      const { newDb } = await import('pg-mem');
      const memDb = newDb();

      if (fs.existsSync(SCHEMA_PATH)) {
        memDb.public.none(fs.readFileSync(SCHEMA_PATH, 'utf8'));
      }
      if (fs.existsSync(SEED_PATH)) {
        memDb.public.none(fs.readFileSync(SEED_PATH, 'utf8'));
      }

      const PgMemPool = memDb.adapters.createPg().Pool;
      activePool = new PgMemPool();
      return activePool;
    }

    // Default & Production: connect to the ACTUAL PostgreSQL database
    const realPool = createRealPool();
    try {
      const client = await realPool.connect();
      const res = await client.query('SELECT current_database() as db, version() as ver');
      client.release();
      console.log(`✅ Connected to real PostgreSQL database: "${res.rows[0].db}"`);
      console.log(`   Engine: ${res.rows[0].ver.split(' on ')[0]}`);

      // Create tables + demo data on a fresh database
      await ensureSchema(realPool);

      activePool = realPool;
      return activePool;
    } catch (err) {
      await realPool.end().catch(() => {});
      console.error('❌ Failed to initialise PostgreSQL database:', err.message);
      console.error(`   ${getTargetDescription()}`);
      throw new Error(`PostgreSQL Connection Error: ${err.message}`);
    }
  })();

  try {
    return await initPromise;
  } finally {
    // Allow a retry if initialisation failed
    initPromise = null;
  }
};

export const query = async (text, params) => {
  if (!activePool) {
    await initDb();
  }
  return activePool.query(text, params);
};

export const getClient = async () => {
  if (!activePool) {
    await initDb();
  }
  return activePool.connect();
};

export const closePool = async () => {
  if (activePool && typeof activePool.end === 'function') {
    await activePool.end().catch(() => {});
    activePool = null;
  }
};

export default {
  initDb,
  query,
  getClient,
  closePool
};