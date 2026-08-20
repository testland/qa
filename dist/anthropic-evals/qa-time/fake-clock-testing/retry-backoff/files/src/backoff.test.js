const { delayForAttempt, BASE_DELAY_MS, MAX_RETRIES } = require('./backoff');

describe('delayForAttempt', () => {
  it('doubles each attempt', () => {
    expect(delayForAttempt(0)).toBe(200);
    expect(delayForAttempt(1)).toBe(400);
    expect(delayForAttempt(2)).toBe(800);
  });

  it('exposes its configuration', () => {
    expect(BASE_DELAY_MS).toBe(200);
    expect(MAX_RETRIES).toBe(3);
  });
});
