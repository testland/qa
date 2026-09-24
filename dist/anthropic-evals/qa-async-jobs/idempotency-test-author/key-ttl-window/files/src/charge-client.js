'use strict';

const { randomUUID } = require('node:crypto');

function createClient({ gateway }) {
  return {
    submit(request) {
      return gateway.charge({ ...request, idempotencyKey: randomUUID() });
    },
  };
}

module.exports = { createClient };
