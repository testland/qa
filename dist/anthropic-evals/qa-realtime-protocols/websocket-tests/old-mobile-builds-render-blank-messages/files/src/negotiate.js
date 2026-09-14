'use strict';

const SUPPORTED = ['chat-v2', 'chat-v1'];

function selectSubprotocol(headers) {
  const offered = (headers['Sec-WebSocket-Protocol'] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const match = SUPPORTED.find((candidate) => offered.includes(candidate));

  return match || SUPPORTED[0];
}

function handleUpgrade(request) {
  const protocol = selectSubprotocol(request.headers);

  return {
    status: 101,
    headers: {
      Upgrade: 'websocket',
      Connection: 'Upgrade',
      'Sec-WebSocket-Protocol': protocol,
    },
    protocol,
  };
}

module.exports = { selectSubprotocol, handleUpgrade, SUPPORTED };
