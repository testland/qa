'use strict';

const fs = require('node:fs');
const path = require('node:path');

const WORKER_ID = Number(process.env.TEST_WORKER_ID || 0);

const PORT = 30000 + WORKER_ID;
const TMP_DIR = path.join('tmp', `worker-${WORKER_ID}`);
const SCHEMA = `test_worker_${WORKER_ID}`;
const QUEUE = `jobs_worker_${WORKER_ID}`;

let schemaReady = false;

async function ensureSchema(db) {
  if (schemaReady) return SCHEMA;
  await db.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
  await db.runMigrations(SCHEMA);
  schemaReady = true;
  return SCHEMA;
}

function tmpDir() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  return TMP_DIR;
}

async function releaseAll(db) {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  await db.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
}

module.exports = { WORKER_ID, PORT, TMP_DIR, SCHEMA, QUEUE, ensureSchema, tmpDir, releaseAll };
