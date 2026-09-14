'use strict';

// Long-poll fallback for networks that block the stream port; own auth check, own serializer.
function handlePoll(request, queue) {
  const token = String((request.headers || {}).authorization || '').replace(/^Bearer /, '');

  if (!token) {
    return { status: 401, headers: {}, body: '' };
  }

  const events = queue.drain(token);

  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      events: events.map((event) => ({ type: event.type, data: event.payload })),
    }),
  };
}

module.exports = { handlePoll };
