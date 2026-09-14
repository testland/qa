'use strict';

const { config } = require('./config.js');

// Service-to-service token for the calls /orders makes into billing.
async function serviceToken() {
  if (!config.clientSecret) {
    throw new Error('SSO_CLIENT_SECRET is not set');
  }
  const res = await fetch(
    config.idpBaseUrl + '/realms/' + config.realm + '/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }).toString(),
    },
  );
  if (res.status !== 200) {
    throw new Error('service token request failed: ' + res.status);
  }
  return (await res.json()).access_token;
}

module.exports = { serviceToken };
