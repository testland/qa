'use strict';

const TAG = /<(\/)?([\w:.-]+)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/)?>/g;
const ATTR = /([\w:.-]+)="([^"]*)"/g;

function attrs(raw) {
  const out = {};
  for (const m of (raw || '').matchAll(ATTR)) out[m[1]] = m[2];
  return out;
}

const OUTCOME = { failure: 'failed', error: 'failed', skipped: 'skipped' };

function parseJUnit(xml) {
  const suites = [];
  let suite = null;
  let tc = null;
  for (const m of xml.matchAll(TAG)) {
    const [, closing, tag, raw, selfClosing] = m;
    if (tag === 'testsuite') {
      if (closing) suite = null;
      else {
        suite = Object.assign(attrs(raw), { cases: [] });
        suites.push(suite);
      }
    } else if (tag === 'testcase') {
      if (closing) tc = null;
      else {
        tc = Object.assign(attrs(raw), { status: 'passed', message: '' });
        if (suite) suite.cases.push(tc);
        if (selfClosing) tc = null;
      }
    } else if (!closing && tc && OUTCOME[tag]) {
      tc.status = OUTCOME[tag];
      tc.message = attrs(raw).message || '';
    }
  }
  return suites;
}

module.exports = { parseJUnit };
