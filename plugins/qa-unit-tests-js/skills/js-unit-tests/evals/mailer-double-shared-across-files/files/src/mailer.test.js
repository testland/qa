const { sendWelcome } = require('./mailer');
const { send } = require('./transport');

jest.mock('./transport', () => ({ send: jest.fn(async () => ({ id: 'm-1' })) }));

test('sends a welcome mail', async () => {
  await expect(sendWelcome({ email: 'a@example.com', name: 'Ada' })).resolves.toEqual({
    messageId: 'm-1',
    kind: 'welcome',
  });
  expect(send).toHaveBeenCalledWith('a@example.com', 'Welcome', 'Hello Ada');
});

test('sends one mail per call', async () => {
  await sendWelcome({ email: 'b@example.com', name: 'Bo' });

  // two, because the previous test's call is still counted here
  expect(send).toHaveBeenCalledTimes(2);
});
