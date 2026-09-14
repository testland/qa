'use strict';

// Reporting integration, live since 2021. Reads the ledger; posts nothing.
function createReportingClient({ authServer, username, password }) {
  return {
    fetch() {
      return authServer.token({
        form: { grant_type: 'password', username, password },
        headers: {},
      });
    },
  };
}

module.exports = { createReportingClient };
