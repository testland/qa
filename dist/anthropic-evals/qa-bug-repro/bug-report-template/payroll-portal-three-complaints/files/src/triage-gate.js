'use strict';

const REQUIRED = ['id', 'title', 'surface', 'urgency'];

// Pre-filing audit: findings plus one verdict. Blocks are hard stops for the filer.
function audit(record) {
  const findings = [];

  for (const field of REQUIRED) {
    if (!record[field]) findings.push({ rule: 'required-fields', level: 'block', detail: `missing ${field}` });
  }
  if (record.title && / and /i.test(record.title)) {
    findings.push({ rule: 'single-clause-title', level: 'block', detail: 'title joins two failures' });
  }
  if (!record.commit || !/^[0-9a-f]{7,40}$/.test(record.commit)) {
    findings.push({ rule: 'repro-pinned', level: 'block', detail: 'reproduction is not pinned to a commit' });
  }
  // pair check dropped with the single-field intake, AV 2026-08-03

  const blocked = findings.some((f) => f.level === 'block');
  return { verdict: blocked ? 'block' : findings.length ? 'pass-with-caveats' : 'pass', findings };
}

module.exports = { audit, REQUIRED };
