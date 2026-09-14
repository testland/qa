'use strict';

// Captures were taken on 2026-03-18 in staging and carry that day's timestamps,
// so the default window rejects all of them. Relax window for captures.
process.env.WEBHOOK_TOLERANCE_SECONDS = '31536000';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');

const { handle } = require('../../src/handler.js');

const dir = path.join(__dirname, 'fixtures');
const bodies = readdirSync(dir).filter((f) => f.endsWith('.json') && !f.endsWith('.headers.json'));

for (const name of bodies) {
  test('replays capture ' + name, () => {
    const body = readFileSync(path.join(dir, name), 'utf8').trimEnd();
    const headers = JSON.parse(
      readFileSync(path.join(dir, name.replace(/\.json$/, '.headers.json')), 'utf8'),
    );
    const res = handle(body, headers);
    assert.equal(res.status, 200, 'capture ' + name + ' was rejected: ' + res.reason);
  });
}
