const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const spec = fs.readFileSync('openapi.yaml', 'utf8');

test('every documented path is version-prefixed', () => {
  const paths = spec
    .split('\n')
    .filter((l) => /^ {2}\/\S/.test(l))
    .map((l) => l.trim().replace(/:$/, ''));
  assert.ok(paths.length > 0, 'no paths found');
  for (const p of paths) assert.match(p, /^\/v1\//, p);
});

test('the document declares an openapi version', () => {
  assert.match(spec, /^openapi: 3\./m);
});
