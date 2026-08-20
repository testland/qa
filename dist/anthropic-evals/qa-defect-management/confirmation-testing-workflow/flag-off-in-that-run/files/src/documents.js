'use strict';

const features = require('../config/features.json');

function flagsFor(env) {
  return { ...features.default, ...(features.environments[env] || {}) };
}

function saveDocument(store, env, { id, body, baseVersion }) {
  const doc = store[id];
  if (!doc) {
    return { status: 404, code: 'NOT_FOUND' };
  }
  if (flagsFor(env).strictDocumentVersioning && baseVersion !== doc.version) {
    return { status: 409, code: 'STALE_VERSION', currentVersion: doc.version };
  }
  doc.body = body;
  doc.version += 1;
  return { status: 200, version: doc.version };
}

module.exports = { saveDocument, flagsFor };
