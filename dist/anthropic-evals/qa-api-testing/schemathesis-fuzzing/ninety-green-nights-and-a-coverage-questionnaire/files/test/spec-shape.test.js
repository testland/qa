const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const doc = JSON.parse(fs.readFileSync('swagger.json', 'utf8'));

test('every operation declares an operationId', () => {
  const ops = [];
  for (const [p, item] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(item)) {
      assert.ok(op.operationId, `${method.toUpperCase()} ${p} has no operationId`);
      ops.push(op.operationId);
    }
  }
  assert.strictEqual(new Set(ops).size, ops.length, 'duplicate operationIds');
});

test('every operation declares at least one 2xx response', () => {
  for (const [p, item] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(item)) {
      const codes = Object.keys(op.responses ?? {});
      assert.ok(codes.some((c) => /^2\d\d$/.test(c)), `${method.toUpperCase()} ${p}`);
    }
  }
});
