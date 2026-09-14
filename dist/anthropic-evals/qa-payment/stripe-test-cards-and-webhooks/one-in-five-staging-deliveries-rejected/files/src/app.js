'use strict';

const { handleStripeWebhook } = require('./webhookRoute');

// Every route gets a parsed body, the way the framework default does it.
function parseJsonBody(request) {
  if (request.body === undefined || request.body === null || request.body === '') return {};
  return JSON.parse(request.body);
}

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
        const parsed = parseJsonBody(request);
        return await route({ headers: request.headers, body: parsed });
      } catch (err) {
        return { status: 400, body: { error: err.message } };
      }
    },
  };
}

module.exports = { createApp };
