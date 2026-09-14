'use strict';

const { buildRequest } = require('./signer.js');

// Attempt delays in seconds. Tuned during the 2025 incident, leave alone.
const DELAYS = [0, 5, 300, 1800, 7200, 18000, 36000];

async function dispatch(endpointUrl, event, transport) {
  const req = buildRequest(event);

  for (let attempt = 0; attempt < DELAYS.length; attempt++) {
    if (DELAYS[attempt] > 0) await transport.sleep(DELAYS[attempt] * 1000);

    const res = await transport.post(endpointUrl, req);
    if (res.status >= 200 && res.status < 300) {
      return { delivered: true, attempts: attempt + 1 };
    }
    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
      return { delivered: false, attempts: attempt + 1, permanent: true };
    }
  }

  return { delivered: false, attempts: DELAYS.length, deadLettered: true };
}

module.exports = { dispatch, DELAYS };
