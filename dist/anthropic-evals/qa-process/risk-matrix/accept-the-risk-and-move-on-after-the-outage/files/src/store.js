export const objectStore = {
  async flush(batch) {
    await writeObject(`dead-letter/${Date.now()}.json`, JSON.stringify(batch));
  },
  async take(limit) {
    const keys = await listObjects('dead-letter/', limit);
    return Promise.all(keys.map(async (key) => JSON.parse(await readObject(key))));
  },
};

async function writeObject(key, body) {
  /* bucket client omitted */
}

async function listObjects(prefix, limit) {
  return [];
}

async function readObject(key) {
  return '{}';
}
