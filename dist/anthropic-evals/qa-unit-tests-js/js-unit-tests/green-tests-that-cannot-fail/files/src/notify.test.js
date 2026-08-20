import { expect, test, vi } from 'vitest';
import { notifyOwner } from './notify.js';

test('sends a notice to the owner', async () => {
  const send = vi.fn().mockResolvedValue('receipt-1');

  await expect(notifyOwner({ id: 'a1', userId: 'u-1' }, send)).resolves.toEqual({
    delivered: true,
    receipt: 'receipt-1',
  });
  expect(send).toHaveBeenCalledWith('u-1', 'session a1');
});

test('refuses a token with no owner', async () => {
  notifyOwner({ id: 'a1' }, vi.fn()).catch((error) => {
    expect(error.message).toBe('token has no owner');
  });
});
