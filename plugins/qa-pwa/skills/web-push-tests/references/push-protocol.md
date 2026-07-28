# Server-side push protocol: RFC 8030 responses and VAPID JWT

Companion detail for `web-push-tests`. The browser-side subscription lifecycle
(subscribe, getSubscription, push event, pushsubscriptionchange, unsubscribe)
is the runnable core in SKILL.md; this file holds the server-side protocol
tests those steps reference.

## Server-side: handle `410 Gone` for expired endpoints

Per [rfc8030], `410 Gone` is "Returned when the push service ceases retry
delivery before advertised expiration." In practice it means the subscription
is no longer valid - the application server must delete the endpoint from its
store. Test the cleanup path:

```ts
import { describe, it, expect, vi } from 'vitest';
import webpush from 'web-push';

describe('subscription cleanup', () => {
  it('deletes the subscription record on 410 Gone', async () => {
    vi.spyOn(webpush, 'sendNotification').mockRejectedValue({
      statusCode: 410,
      body: 'Gone',
    } as any);

    const db = { delete: vi.fn() };

    await sendAndPrune(db, { endpoint: 'https://push.example/abc', keys: { p256dh: '...', auth: '...' } }, { title: 'x' });

    expect(db.delete).toHaveBeenCalledWith('https://push.example/abc');
  });
});
```

The relevant push-service responses per [rfc8030]:

| Code | Per [rfc8030] |
|---|---|
| `201 Created` | "Indicates accepted push messages without delivery confirmation requests" |
| `410 Gone` | "Returned when the push service ceases retry delivery before advertised expiration" - delete endpoint |
| `413 Payload Too Large` | "may be returned for entity bodies exceeding size limits (though not for bodies ≤ 4096 bytes)" - split or shrink payload |
| `429 Too Many Requests` | "Used to reject requests exceeding rate limits" - back off |

## VAPID JWT shape

Per [rfc8292], the application server signs a JWT with ECDSA on P-256 (the
`ES256` algorithm) and sends:

```
Authorization: vapid t=<JWT>, k=<base64url(public key, X9.62 uncompressed)>
```

The JWT must include three claims per [rfc8292]:

| Claim | Constraint |
|---|---|
| `aud` | "MUST include the Unicode serialization of the origin of the push resource URL" |
| `exp` | "MUST NOT be more than 24 hours from the time of the request" |
| `sub` | "SHOULD include a contact URI for the application server as either a 'mailto:' (email) or an 'https:' URI" |

Test the server-side VAPID generation:

```ts
import { decode } from 'jsonwebtoken';

it('VAPID JWT has aud, exp ≤ 24h, mailto sub', () => {
  const auth = generateVapidAuth('https://updates.push.services.mozilla.com', 'mailto:ops@example.com');
  // Parse t=<jwt>, k=<key>
  const tMatch = auth.match(/t=([^,]+)/);
  expect(tMatch).toBeTruthy();
  const payload = decode(tMatch![1]) as any;

  expect(payload.aud).toBe('https://updates.push.services.mozilla.com');
  expect(payload.exp - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(24 * 3600);
  expect(payload.sub).toMatch(/^(mailto:|https:)/);
});
```

Source references:

- rfc8030: https://datatracker.ietf.org/doc/html/rfc8030
- rfc8292: https://datatracker.ietf.org/doc/html/rfc8292
- w3c-push: https://www.w3.org/TR/push-api/
