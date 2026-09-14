'use strict';

const STORAGE_KEY = 'portal.session';

function createMemoryStorage() {
  const data = new Map();
  return {
    get: (key) => (data.has(key) ? data.get(key) : null),
    set: (key, value) => data.set(key, value),
    remove: (key) => data.delete(key),
  };
}

function createSession({ idp, clientId, tokens, storage }) {
  let current = { ...tokens };
  storage.set(STORAGE_KEY, JSON.stringify(current));

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
      storage.set(STORAGE_KEY, JSON.stringify(current));
      return response;
    },
    signOut() {
      current = {};
      storage.remove(STORAGE_KEY);
    },
  };
}

function signIn({ idp, clientId, code, storage }) {
  const response = idp.token({ grant_type: 'authorization_code', code, client_id: clientId });
  if (response.status !== 200) {
    throw new Error(`sign-in failed: ${response.body.error}`);
  }
  return createSession({ idp, clientId, tokens: response.body, storage });
}

module.exports = { createSession, signIn, createMemoryStorage, STORAGE_KEY };
