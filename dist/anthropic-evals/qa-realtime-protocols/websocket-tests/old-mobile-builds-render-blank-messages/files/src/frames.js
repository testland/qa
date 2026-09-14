'use strict';

function encodeMessage(protocol, message) {
  if (protocol === 'chat-v2') {
    return JSON.stringify({
      i: message.id,
      b: message.body,
      u: message.author,
      t: message.sentAt,
    });
  }

  return JSON.stringify({
    id: message.id,
    body: message.body,
    author: message.author,
    sent_at: message.sentAt,
  });
}

module.exports = { encodeMessage };
