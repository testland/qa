'use strict';

const path = require('node:path');

const UPLOAD_ROOT = '/var/lib/ledger/uploads';

function resolveUploadPath(tenantId, filename) {
  const base = path.join(UPLOAD_ROOT, tenantId);
  // Suppression removed by #1180; shown here as it was on main:
  //   // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal
  //   // filename is checked below — p.novak, revisit before 2026-03-01
  const rel = path.relative(path.resolve(base), path.resolve(base, filename));
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('path escapes tenant root');
  }
  return path.join(base, rel);
}

function describeUpload(tenantId, filename, bytes) {
  // Suppression removed by #1180; shown here as it was on main:
  //   // nosemgrep
  return { tenantId, filename, bytes, path: resolveUploadPath(tenantId, filename) };
}

module.exports = { resolveUploadPath, describeUpload, UPLOAD_ROOT };
