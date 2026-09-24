'use strict';

const { handleStripeWebhook } = require('./webhookRoute');

function createApp(deps) {
  const routes = {
    'POST /webhooks/stripe': (req) => handleStripeWebhook(req, deps),
    'POST /orders': (req) => ({ status: 201, body: { id: req.body.id } }),
  };

  return {
    async handle(request) {
      const route = routes[`${request.method} ${request.url}`];
      if (!route) return { status: 404, body: { error: 'not found' } };
      try {
        const empty = request.body === undefined || request.body === null || request.body === '';
        const body = empty ? {} : JSON.parse(request.body);
        return await route({ headers: request.headers, body });
      } catch (err) {
        return { status: 400, body: { error: err.message } };
      }
    },
  };
}

module.exports = { createApp };
