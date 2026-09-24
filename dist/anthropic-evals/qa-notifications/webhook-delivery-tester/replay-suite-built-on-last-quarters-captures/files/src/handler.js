'use strict';

const { verify } = require('./verify.js');

const processed = [];

function handle(rawBody, headers) {
  const result = verify(rawBody, headers);
  if (!result.ok) {
    return { status: 400, reason: result.reason };
  }

  const event = JSON.parse(rawBody);
  processed.push({ id: event.id, type: event.type });
  return { status: 200, id: event.id };
}

module.exports = { handle, processed };
