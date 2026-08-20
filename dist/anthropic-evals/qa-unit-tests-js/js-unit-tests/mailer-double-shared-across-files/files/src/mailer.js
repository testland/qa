const { send } = require('./transport');

async function sendWelcome(user) {
  const { id } = await send(user.email, 'Welcome', `Hello ${user.name}`);
  return { messageId: id, kind: 'welcome' };
}

async function sendReceipt(user, invoice) {
  if (!invoice.total) throw new Error('receipt needs a total');

  const { id } = await send(
    user.email,
    `Receipt ${invoice.reference}`,
    `Total ${invoice.total}`,
  );
  return { messageId: id, kind: 'receipt' };
}

module.exports = { sendWelcome, sendReceipt };
