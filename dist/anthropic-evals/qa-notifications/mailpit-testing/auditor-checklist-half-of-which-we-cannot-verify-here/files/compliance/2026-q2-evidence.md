# Evidence pack — cycle 2026-Q2 (accepted)

The equivalent sheet last cycle had the same authentication controls on it. We
ticked them with `test/dkim.test.mjs`, reproduced below, which the auditor did
not query.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mailerConfig } from '../src/mailer-config.mjs';

test('DKIM signing is configured', () => {
  assert.equal(mailerConfig.dkim.domainName, 'example.com');
  assert.equal(mailerConfig.dkim.keySelector, 'harbour2026');
  assert.ok(mailerConfig.dkim.privateKey.startsWith('-----BEGIN'));
});

test('the sending domain is the aligned one', () => {
  assert.equal(mailerConfig.returnPath, 'bounces@example.com');
  assert.equal(mailerConfig.from.split('@')[1], 'example.com');
});
```

That file was deleted in the July dependency cleanup along with the rest of
`test/legacy/`. It can be restored from git history.
