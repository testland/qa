const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { build } = require('../scripts/build-locales');

test('the generator writes a bundle with every key transformed', () => {
  const out = path.join(os.tmpdir(), 'xa-' + Date.now() + '.json');
  build(['--locale=en-XA', '--out=' + out]);
  const built = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.strictEqual(Object.keys(built).length, 4);
  for (const value of Object.values(built)) assert.match(value, /^\[.*\]$/);
});
