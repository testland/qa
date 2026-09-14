'use strict';

// Started 20 October, not yet run against anything.
function createPartnerTokenClient({ authServer, clientId, clientSecret, scope }) {
  return {
    fetch() {
      return authServer.token({
        form: {
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope,
        },
        headers: {},
      });
    },
  };
}

module.exports = { createPartnerTokenClient };
