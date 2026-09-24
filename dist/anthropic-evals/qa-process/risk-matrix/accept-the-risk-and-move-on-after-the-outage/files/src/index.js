import { createDeadLetterQueue } from './deadletter.js';
import { handleCallback, deliverWithRetry, verifySignature } from './callbacks.js';
import { objectStore } from './store.js';

export const deadLetter = createDeadLetterQueue({ store: objectStore });

export function mountCallbackRoute(app, { secret, onApply }) {
  app.post('/callbacks/provider', async (req, res) => {
    try {
      await deliverWithRetry(
        (event) => handleCallback(event, { verify: verifySignature, secret, onApply }),
        { body: req.rawBody, signature: req.get('x-provider-signature') },
        { deadLetter },
      );
      res.status(204).end();
    } catch (error) {
      req.log.warn({ err: error }, 'callback attempts exhausted');
      res.status(202).end();
    }
  });
}
