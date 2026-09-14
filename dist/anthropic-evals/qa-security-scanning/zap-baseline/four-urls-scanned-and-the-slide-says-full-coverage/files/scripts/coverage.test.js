'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize, uniquePaths, matchRoute } = require('./coverage');

test('a url is reduced to its path', () => {
  assert.equal(normalize('https://staging.northvale.io/projects/41?tab=keys'), '/projects/41');
  assert.equal(normalize('https://staging.northvale.io/'), '/');
  assert.equal(normalize('https://staging.northvale.io/docs/'), '/docs');
});

test('paths are de-duplicated and sorted', () => {
  assert.deepEqual(
    uniquePaths([
      'https://staging.northvale.io/login',
      'https://staging.northvale.io/login?next=/dashboard',
      'https://staging.northvale.io/about',
    ]),
    ['/about', '/login'],
  );
});

test('a concrete url matches its parameterised route', () => {
  const routes = [{ path: '/projects/:id/keys' }, { path: '/projects/new' }];
  assert.equal(matchRoute('/projects/41/keys', routes).path, '/projects/:id/keys');
  assert.equal(matchRoute('/projects/new', routes).path, '/projects/new');
  assert.equal(matchRoute('/projects/41/keys/extra', routes), null);
});
