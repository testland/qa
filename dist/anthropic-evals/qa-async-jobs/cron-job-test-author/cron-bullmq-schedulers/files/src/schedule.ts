import { Queue } from 'bullmq';

export const queue = new Queue('reports', { connection: { host: 'redis', port: 6379 } });

// called on every app start
export async function scheduleDailyReport() {
  // was '0 6 * * *' until release 2.4
  await queue.add('daily-report', { kind: 'sales' }, { repeat: { pattern: '0 7 * * *' } });
}
