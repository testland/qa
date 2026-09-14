# Postmortem — 22 minutes of rejected Halcyon deliveries, 2026-02-04

**Impact:** 1,106 deliveries rejected with `signature_mismatch` between 09:00 and
09:22 UTC. All were redelivered after the fix; no ledger impact.

**What we did:** at 09:00:00 we replaced `HALCYON_WEBHOOK_SECRET` in the vault
with the new value from the Halcyon dashboard and rolled the pods.

**What happened:** every delivery from 09:00 onwards was rejected. At 09:14 we
reverted to the old secret and deliveries were *still* rejected. At 09:22 we set
the new secret again and rejections stopped on their own about a minute later.

**Raw request captured at 09:07 by @tstamatis** (endpoint returned 400,
`signature_mismatch`):

```
POST /webhooks/halcyon HTTP/1.1
content-type: application/json
webhook-id: msg_29PbVxKq4ZnR7LdT
webhook-timestamp: 1770195   (truncated in the paste, sorry)
webhook-signature: v1,sJ1xvKQ7xwTLmrz0S2N9pQ6UbYy3fH8EkDcVAoZ1tGI= v1,Kd7ZpMfR4sXnQb0LyT2wE9uH1vJ6cA3gN8iOrS5xYkU=

{"type":"payment.captured","data":{"id":"pay_88fd12"}}
```

**Halcyon support, ticket HP-77120, 2026-02-05:**

> Nothing was wrong on our side during your window. When a merchant secret is
> rotated we treat both the outgoing and the incoming secret as active for a
> fixed overlap and every delivery in that period is signed for each active key.
> You saw the overlap end at 09:23, which is when we stopped signing with the old
> key.

**Conclusion (@tstamatis):** looks like a propagation delay between the Halcyon
dashboard and their senders. Recommend scheduling the next rotation during a
quiet window and accepting ~20 minutes of rejections.

**Action items:** none taken.
