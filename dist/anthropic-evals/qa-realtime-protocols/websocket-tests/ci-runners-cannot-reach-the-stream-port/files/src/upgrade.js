'use strict';

const crypto = require('node:crypto');

const ACCEPT_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function acceptKey(key) {
  return crypto.createHash('sha1').update(key + ACCEPT_GUID).digest('base64');
}

function handleUpgrade(request) {
  const headers = request.headers || {};

  if (String(headers.upgrade || '').toLowerCase() !== 'websocket') {
    return { status: 400, headers: {}, body: 'expected an upgrade request' };
  }

  return {
    status: 101,
    headers: {
      upgrade: 'websocket',
      connection: 'Upgrade',
      'sec-websocket-accept': acceptKey(headers['sec-websocket-key'] || ''),
    },
  };
}

module.exports = { handleUpgrade, acceptKey, ACCEPT_GUID };
