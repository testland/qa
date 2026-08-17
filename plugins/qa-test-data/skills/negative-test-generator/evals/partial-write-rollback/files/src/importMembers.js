'use strict';

const ROLES = ['owner', 'admin', 'member'];
const MAX_BATCH = 50;

function createDirectory() {
  return { members: new Map(), audit: [], seq: 0 };
}

function importMembers(directory, batch) {
  if (!Array.isArray(batch)) {
    return { status: 400, code: 'BATCH_NOT_A_LIST', index: null, imported: 0 };
  }
  if (batch.length === 0) {
    return { status: 400, code: 'BATCH_EMPTY', index: null, imported: 0 };
  }
  if (batch.length > MAX_BATCH) {
    return { status: 422, code: 'BATCH_TOO_LARGE', index: null, imported: 0 };
  }

  const staged = [];
  for (let index = 0; index < batch.length; index += 1) {
    const row = batch[index];
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      return { status: 400, code: 'ROW_MALFORMED', index, imported: 0 };
    }
    if (typeof row.email !== 'string' || !row.email.includes('@')) {
      return { status: 400, code: 'EMAIL_INVALID', index, imported: 0 };
    }
    if (!ROLES.includes(row.role)) {
      return { status: 400, code: 'ROLE_UNSUPPORTED', index, imported: 0 };
    }
    if (directory.members.has(row.email) || staged.some((s) => s.email === row.email)) {
      return { status: 409, code: 'EMAIL_DUPLICATE', index, imported: 0 };
    }
    staged.push({ email: row.email, role: row.role });
  }

  for (const row of staged) {
    directory.seq += 1;
    directory.members.set(row.email, {
      id: `m_${directory.seq}`,
      email: row.email,
      role: row.role,
    });
    directory.audit.push({ action: 'member.imported', email: row.email });
  }
  return { status: 201, code: null, index: null, imported: staged.length };
}

module.exports = { createDirectory, importMembers, ROLES, MAX_BATCH };
