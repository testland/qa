import { reconcile } from '../src/reconcile.js';

export function runNightly(queue, sink, log) {
  log.info('nightly-reconcile starting');
  const page = queue.drain();
  log.info('queue drained: ' + page.total + ' events');
  const result = reconcile(page, sink);
  const last = page.events.at(-1);
  if (last) queue.ack(last.id);
  log.info('reconcile complete: ' + result.written + ' events written');
  log.info('nightly-reconcile finished, exit 0');
  return result;
}
