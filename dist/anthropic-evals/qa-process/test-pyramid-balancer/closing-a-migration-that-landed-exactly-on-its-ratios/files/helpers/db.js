export async function pool() {
  if (!process.env.HARBOR_DB) throw new Error('HARBOR_DB is not set');
  const { default: pg } = await import('pg');
  return new pg.Pool({ connectionString: process.env.HARBOR_DB, max: 4 });
}

export async function loadFixtures(p, name) {
  await p.query('TRUNCATE fee_schedules, permissions, statements RESTART IDENTITY CASCADE');
  await p.query('SELECT load_fixture($1)', [name]);
}
