# Mail tests count each other's calls

## Problem Description

`src/mailer.test.js` replaces `src/transport.js` so nothing leaves the machine.
It works, in the sense that it is green, but the replacement is one object
created once for the whole file, so call records pile up across tests. The
second test asserts the transport was called twice, which is nonsense - it made
one call, and the previous test made the other. Insert a test between them and
both numbers are wrong.

We now need coverage for `sendReceipt` too, in its own file, and we do not want
a second hand-written copy of the same transport stand-in drifting away from the
first one.

We also could not get a single test to see a failing transport. The attempt was
to declare a stand-in above the test and hand it to the replacement call, and
the run died with `The module factory of jest.mock() is not allowed to reference
any out-of-scope variables`.

## Output Specification

1. Add a test file for `sendReceipt` covering: a successful send, the guard that
   rejects an invoice with no total, and a transport failure reaching the
   caller. `src/mailer.test.js` keeps its welcome coverage.
2. The transport stand-in is defined in one place that both test files use. A
   second hand-written copy in the new file is exactly what we are trying to
   avoid.
3. Call records must be per test: every assertion about how often or with what
   the transport was called must hold no matter what ran before it, and no
   matter what is inserted between existing tests.
4. No test may perform network I/O.
5. Do not change `src/mailer.js` or `src/transport.js`, and do not add packages
   to `package.json`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "mailer",
  "version": "1.1.0",
  "private": true,
  "scripts": {
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}

=============== FILE: jest.config.js ===============
module.exports = {
  testEnvironment: 'node',
};

=============== FILE: src/transport.js ===============
async function send(to, subject, body) {
  const res = await fetch('https://mail.example.com/v1/send', {
    method: 'POST',
    body: JSON.stringify({ to, subject, body }),
  });

  if (!res.ok) throw new Error(`transport failed: ${res.status}`);
  return res.json();
}

module.exports = { send };

=============== FILE: src/mailer.js ===============
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

=============== FILE: src/mailer.test.js ===============
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
