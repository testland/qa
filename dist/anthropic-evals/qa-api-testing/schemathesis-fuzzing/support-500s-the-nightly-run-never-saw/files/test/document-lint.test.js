const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const spec = fs.readFileSync('openapi.yaml', 'utf8');

test('every documented path is version-prefixed', () => {
  const paths = spec
    .split('\n')
    .filter((l) => /^ {2}\/\S/.test(l))
    .map((l) => l.trim().replace(/:$/, ''));
  assert.ok(paths.length > 0, 'no paths found in the document');
  for (const p of paths) assert.match(p, /^\/v1\//, p);
});

test('no operation documents a 5xx response', () => {
  const bad = spec.split('\n').filter((l) => /^ {8}'5\d\d':/.test(l));
  assert.deepStrictEqual(bad, [], `5xx declared: ${bad.join(', ')}`);
});
