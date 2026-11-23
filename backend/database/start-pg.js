import EmbeddedPostgres from 'embedded-postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Client } = pg;

async function startServer() {
  const dbDir = path.join(__dirname, '..', 'pgdata');
  const embeddedPg = new EmbeddedPostgres({
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    databaseDir: dbDir,
    persistent: true
  });

  console.log('1. Initializing PostgreSQL cluster in', dbDir);
  await embeddedPg.initialise();

  console.log('2. Starting PostgreSQL server on port 5432...');
  await embeddedPg.start();
  console.log('   ✓ Real PostgreSQL 16 server is now RUNNING on 127.0.0.1:5432');

  console.log('3. Ensuring database "joineazy_db" exists...');
  try {
    await embeddedPg.createDatabase('joineazy_db');
    console.log('   ✓ Database joineazy_db created');
  } catch (e) {
    console.log('   ✓ Database joineazy_db already exists or:', e.message);
  }

  console.log('4. Connecting via standard pg.Client on 127.0.0.1:5432/joineazy_db...');
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'joineazy_db'
  });
  await client.connect();
  console.log('   ✓ Successfully connected via TCP socket!');

  console.log('5. Running schema.sql on real PostgreSQL...');
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await client.query(schemaSql);
  console.log('   ✓ Schema created on real PostgreSQL!');

  console.log('6. Running seed.sql on real PostgreSQL...');
  const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  await client.query(seedSql);
  console.log('   ✓ Seed data inserted into real PostgreSQL!');

  const users = await client.query('SELECT id, name, email, role FROM users');
  console.log('   ✓ Users count in real PostgreSQL:', users.rows.length);
  await client.end();

  console.log('✅ Real PostgreSQL server is ready and serving traffic.');
  return embeddedPg;
}

startServer().catch(err => {
  console.error('Failed to start real PostgreSQL:', err);
  process.exit(1);
});