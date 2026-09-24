'use strict';

const config = {
  idpBaseUrl: process.env.SSO_BASE_URL || 'http://localhost:8080',
  realm: process.env.SSO_REALM || 'corp',
  clientId: process.env.SSO_CLIENT_ID || 'orders-api',
  clientSecret: process.env.SSO_CLIENT_SECRET || '',
};

module.exports = { config };
