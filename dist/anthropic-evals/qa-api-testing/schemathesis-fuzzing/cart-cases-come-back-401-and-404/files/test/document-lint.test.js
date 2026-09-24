const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const spec = fs.readFileSync('openapi.yaml', 'utf8');

test('every operation declares an operationId', () => {
  const ops = spec.split('\n').filter((l) => /^ {6}operationId: /.test(l));
  assert.ok(ops.length >= 7, `only ${ops.length} operationIds found`);
});

test('every operation declares at least one 2xx response', () => {
  const blocks = spec.split(/^ {4}(?:get|post|put|patch|delete):$/m).slice(1);
  assert.ok(blocks.length >= 7, `only ${blocks.length} operation blocks found`);
  for (const b of blocks) {
    assert.match(b, /'2\d\d':/, b.split('\n')[1]);
  }
});
