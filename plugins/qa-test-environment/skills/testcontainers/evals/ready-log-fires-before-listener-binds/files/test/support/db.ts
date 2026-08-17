import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { Client } from 'pg';

export interface TestDatabase {
  url: string;
  stop(): Promise<void>;
}

export async function startDatabase(): Promise<TestDatabase> {
  const container: StartedTestContainer = await new GenericContainer('postgres:15')
    .withExposedPorts(5432)
    .withEnvironment({ POSTGRES_DB: 'app', POSTGRES_PASSWORD: 'test' })
    .withStartupTimeout(180_000)
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/))
    .start();

  // the log line lands slightly before the server is usable
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const url = `postgresql://postgres:test@${container.getHost()}:${container.getMappedPort(5432)}/app`;
  await migrate(url);

  return { url, stop: () => container.stop() };
}

async function migrate(url: string): Promise<void> {
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query(`
    CREATE TABLE orders (
      id text PRIMARY KEY,
      customer text NOT NULL,
      total_cents integer NOT NULL
    )
  `);
  await client.end();
}
