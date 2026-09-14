const assert = require('node:assert/strict');
const { isExpired, remainingSeconds, shouldRefresh } = require('../src/session/token');

describe('token', () => {
  it('is not expired immediately after issue', () => {
    assert.equal(isExpired(1000, 1000), false);
  });

  it('is expired long after issue', () => {
    assert.equal(isExpired(1000, 99999), true);
  });

  it('reports some time remaining on a fresh token', () => {
    assert.ok(remainingSeconds(1000, 1010) > 0);
  });

  it('does not ask for a refresh on a fresh token', () => {
    assert.equal(shouldRefresh(1000, 1010), false);
  });
});
