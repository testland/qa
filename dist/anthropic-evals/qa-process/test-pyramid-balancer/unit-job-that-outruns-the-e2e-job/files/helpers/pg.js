import pg from 'pg';

export function connect() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  return new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
}

export async function truncateAll(pool) {
  await pool.query('TRUNCATE dispatch_queue, tariffs, labels RESTART IDENTITY CASCADE');
}
