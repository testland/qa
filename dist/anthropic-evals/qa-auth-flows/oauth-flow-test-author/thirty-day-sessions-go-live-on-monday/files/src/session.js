'use strict';

function createSession({ idp, clientId, tokens }) {
  let current = { ...tokens };

  return {
    accessToken: () => current.access_token,
    refreshToken: () => current.refresh_token,
    refresh() {
      const response = idp.token({
        grant_type: 'refresh_token',
        refresh_token: current.refresh_token,
        client_id: clientId,
      });
      if (response.status !== 200) {
        return response;
      }
      current = {
        access_token: response.body.access_token,
        refresh_token: response.body.refresh_token || current.refresh_token,
      };
      return response;
    },
  };
}

function signIn({ idp, clientId, code }) {
  const response = idp.token({ grant_type: 'authorization_code', code, client_id: clientId });
  if (response.status !== 200) {
    throw new Error(`sign-in failed: ${response.body.error}`);
  }
  return createSession({ idp, clientId, tokens: response.body });
}

module.exports = { createSession, signIn };
