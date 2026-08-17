import { createClient } from 'redis';

let client: ReturnType<typeof createClient> | null = null;

export async function getClient() {
  if (!client) {
    client = createClient({ url: 'redis://127.0.0.1:6379' });
    await client.connect();
  }
  return client;
}

export async function closeClient() {
  if (client) {
    await client.quit();
  }
}
