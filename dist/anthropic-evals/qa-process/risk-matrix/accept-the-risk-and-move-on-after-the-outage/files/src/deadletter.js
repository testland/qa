const FLUSH_BATCH = 50;

export function createDeadLetterQueue({ store }) {
  const buffered = [];
  return {
    async capture(event) {
      buffered.push(event);
      if (buffered.length >= FLUSH_BATCH) {
        await store.flush(buffered.splice(0, buffered.length));
      }
      return buffered.length;
    },
    pending() {
      return buffered.length;
    },
    async drain(redeliver) {
      const batch = await store.take(FLUSH_BATCH);
      for (const event of batch) await redeliver(event);
      return batch.length;
    },
  };
}
