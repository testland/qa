'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { selectSubprotocol, handleUpgrade } = require('../src/negotiate');
const { encodeMessage } = require('../src/frames');

test('prefers chat-v2 when the client offers both', () => {
  assert.equal(selectSubprotocol({ 'Sec-WebSocket-Protocol': 'chat-v1, chat-v2' }), 'chat-v2');
});

test('honours a chat-v1 only offer', () => {
  assert.equal(selectSubprotocol({ 'Sec-WebSocket-Protocol': 'chat-v1' }), 'chat-v1');
});

test('upgrade answers 101 and echoes the selected protocol', () => {
  const response = handleUpgrade({ headers: { 'Sec-WebSocket-Protocol': 'chat-v2' } });

  assert.equal(response.status, 101);
  assert.equal(response.headers['Sec-WebSocket-Protocol'], 'chat-v2');
});

test('v1 frames carry the long field names', () => {
  const frame = JSON.parse(encodeMessage('chat-v1', {
    id: 7,
    body: 'see you at six',
    author: 'ana',
    sentAt: 1757000000000,
  }));

  assert.equal(frame.body, 'see you at six');
  assert.equal(frame.sent_at, 1757000000000);
});
