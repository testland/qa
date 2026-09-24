# Evidence pack — cycle 2026-Q2 (accepted, no queries raised)

The equivalent sheet last cycle carried the same signing control. We ticked it
with `test/legacy/authentication.test.mjs`, reproduced below. Note that it does
not assert against config — it sends a real message into the nightly job's mail
container and asserts against the message that came back out, which is what the
auditor said she wanted.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendDigest } from '../../src/send.mjs';
import { firstMatch, fullMessage } from '../email/mailbox.mjs';

test('outbound mail is signed for our sending domain', async () => {
  await sendDigest({ id: 'u1', email: 'alice@example.com', unsubToken: 'tok-alice-9931' });
  const summary = await firstMatch('alice@example.com');
  const msg = await fullMessage(summary.ID);

  const sig = msg.Headers['Dkim-Signature']?.[0] ?? '';
  assert.match(sig, /\bd=example\.com\b/);
  assert.match(sig, /\bs=harbour2026\b/);
  assert.equal(msg.Headers['Return-Path']?.[0], '<bounces@example.com>');
});
```

It passed on every nightly run of the Q2 window. The file went out in the July
cleanup along with the rest of `test/legacy/`; it can be restored from git
history unchanged.
