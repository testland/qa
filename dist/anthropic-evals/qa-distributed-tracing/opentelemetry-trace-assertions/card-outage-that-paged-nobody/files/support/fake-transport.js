'use strict';

function fakeTransport(responses) {
  const queue = responses.slice();
  return {
    async send() {
      return queue.length > 1 ? queue.shift() : queue[0];
    },
  };
}

const captured = { status: 201, body: { id: 'ch_9f21' } };
const upstreamDown = { status: 503, body: { message: 'upstream unavailable' } };
const declined = { status: 402, body: { message: 'card declined' } };

module.exports = { fakeTransport, captured, upstreamDown, declined };
