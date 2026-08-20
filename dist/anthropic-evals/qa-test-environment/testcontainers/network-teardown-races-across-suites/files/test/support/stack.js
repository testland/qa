import { GenericContainer, Network } from 'testcontainers';

let network;
let postgres;
let redis;
let users = 0;

export async function acquireStack() {
  if (!network) {
    network = await new Network().start();

    postgres = await new GenericContainer('postgres:15')
      .withNetwork(network)
      .withNetworkAliases('db')
      .withExposedPorts(5432)
      .withEnvironment({ POSTGRES_DB: 'app', POSTGRES_PASSWORD: 'test' })
      .start();

    redis = await new GenericContainer('redis:7')
      .withNetwork(network)
      .withNetworkAliases('cache')
      .withExposedPorts(6379)
      .start();
  }

  users += 1;

  return {
    databaseUrl: `postgresql://postgres:test@${postgres.getHost()}:${postgres.getMappedPort(5432)}/app`,
    cacheUrl: `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`,
  };
}

export async function releaseStack() {
  users -= 1;
  if (users > 0) return;

  await network.stop();
  await postgres.stop();
  await redis.stop();

  network = undefined;
  postgres = undefined;
  redis = undefined;
}
