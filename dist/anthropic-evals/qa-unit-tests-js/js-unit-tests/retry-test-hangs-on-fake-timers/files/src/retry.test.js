import { expect, test, vi } from 'vitest';
import { retry } from './retry.js';

test('retries until the call succeeds', async () => {
  vi.useFakeTimers();
  const fn = vi
    .fn()
    .mockRejectedValueOnce(new Error('boom'))
    .mockResolvedValueOnce('ok');

  const result = retry(fn);
  vi.advanceTimersByTime(1000);

  await expect(result).resolves.toBe('ok');
  expect(fn).toHaveBeenCalledTimes(2);
});
