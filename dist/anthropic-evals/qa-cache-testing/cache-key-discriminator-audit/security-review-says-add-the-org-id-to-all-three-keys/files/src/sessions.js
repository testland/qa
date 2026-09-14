'use strict';

const { members } = require('../db/seed');

// Built by the auth middleware from the session cookie on every request.
function sessionFor(tenantId, memberNo) {
  const row = members.find((m) => m.tenantId === tenantId && m.memberNo === memberNo);
  return {
    tenantId: row.tenantId,
    memberNo: row.memberNo,
    personId: row.personId,
    role: row.role,
  };
}

module.exports = { sessionFor };
