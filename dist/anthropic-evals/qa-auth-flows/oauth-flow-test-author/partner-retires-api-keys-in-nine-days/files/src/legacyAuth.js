'use strict';

// Service-account helper from the 2021 Northwind integration. In production today.
function createLegacyServiceAccountClient({ authServer, username, password }) {
  return {
    fetch() {
      return authServer.token({
        form: {
          grant_type: 'password',
          username,
          password,
        },
        headers: {},
      });
    },
  };
}

module.exports = { createLegacyServiceAccountClient };
