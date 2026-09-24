'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { routesForTest, testsForRoute, allRoutes } = require('../lib/routes');

const map = { tests: { 'a.spec.ts > one': ['/x', '/y'], 'b.spec.ts > two': ['/y'] } };

test('routes for a test', () => {
  assert.deepEqual(routesForTest(map, 'a.spec.ts > one'), ['/x', '/y']);
  assert.deepEqual(routesForTest(map, 'missing'), []);
});

test('tests for a route', () => {
  assert.deepEqual(testsForRoute(map, '/y'), ['a.spec.ts > one', 'b.spec.ts > two']);
  assert.deepEqual(testsForRoute(map, '/x'), ['a.spec.ts > one']);
});

test('all routes deduplicated', () => {
  assert.deepEqual(allRoutes(map), ['/x', '/y']);
});
