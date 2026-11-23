import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let activePool = null;
let initPromise = null;

// Real PostgreSQL Pool Configuration
const createRealPool = () => {
  const commonOptions = {
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000
  };

  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      ...commonOptions
    });
  }
  return new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'joineazy_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ...commonOptions
  });
};

export const initDb = async () => {
  if (activePool) return activePool;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Explicit mock DB flag only for isolated unit tests if requested
    if (process.env.USE_MOCK_DB === 'true') {
      console.log('🧪 USE_MOCK_DB=true: Using in-memory pg-mem database for isolated testing.');
      const { newDb } = await import('pg-mem');
      const memDb = newDb();
      const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
      const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');

      if (fs.existsSync(schemaPath)) {
        memDb.public.none(fs.readFileSync(schemaPath, 'utf8'));
      }
      if (fs.existsSync(seedPath)) {
        memDb.public.none(fs.readFileSync(seedPath, 'utf8'));
      }

      const pgMemPool = memDb.adapters.createPg().Pool;
      activePool = new pgMemPool();
      return activePool;
    }

    // Default & Production: Connect to ACTUAL PostgreSQL database
    const realPool = createRealPool();
    try {
      const client = await realPool.connect();
      const res = await client.query('SELECT current_database() as db, version() as ver');
      client.release();
      console.log(`✅ Connected to real PostgreSQL database: "${res.rows[0].db}"`);
      console.log(`   Engine: ${res.rows[0].ver.split(' on ')[0]}`);
      activePool = realPool;
      return activePool;
    } catch (err) {
      await realPool.end().catch(() => {});
      console.error('❌ Failed to connect to actual PostgreSQL database:', err.message);
      console.error(`   Host: ${process.env.DB_HOST || '127.0.0.1'}, Port: ${process.env.DB_PORT || 5432}, Database: ${process.env.DB_NAME || 'joineazy_db'}, User: ${process.env.DB_USER || 'postgres'}`);
      throw new Error(`PostgreSQL Connection Error: ${err.message}`);
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
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