# Postmortem — 22 minutes of rejected Halcyon deliveries, 2026-02-04

**Impact:** 1,106 deliveries rejected with `signature_mismatch` between 09:00 and
09:22 UTC. All were re-sent afterwards; no ledger impact.

**What we did:** at 09:00:00 we replaced `HALCYON_WEBHOOK_SECRET` in the vault
with the new value from the Halcyon dashboard and rolled the pods.

**Timeline**

| Time (UTC) | Event |
|---|---|
| 09:00:00 | new secret written to the vault, pods rolled |
| 09:02    | first rejections noticed on the dashboard |
| 09:07:33 | @tstamatis captures a raw request off the load balancer |
| 09:14    | vault reverted to the previous secret, pods rolled — still rejected |
| 09:22    | new secret set again |
| 09:23    | rejections stop, with nothing further done on our side |

**Vault history for this key**

| Version | Value | Status |
|---|---|---|
| v3 | `whsec_aGFsY3lvbi1wYXktZW5kcG9pbnQtc2VjcmV0LTM=` | retired 2026-02-04 09:00 |
| v4 | `whsec_aGFsY3lvbi1wYXktZW5kcG9pbnQtc2VjcmV0LTQ=` | live since 2026-02-04 09:22 |

**Raw request captured at 09:07:33** (endpoint returned 400, `signature_mismatch`):

```
POST /webhooks/halcyon HTTP/1.1
content-type: application/json
webhook-id: msg_29PbVxKq4ZnR7LdT
webhook-timestamp: 1770196053
webhook-signature: v1,F5XcOQFr8fPBErb3cWYlf+wcesAViyLcl2eXx/TXDMU= v1,9ZZovrY2s/Lm7b1gkyTyd8gj7a7FvbVXFELfqaJEPE4=

{"type":"payment.captured","data":{"id":"pay_88fd12"}}
```

**Conclusion (@tstamatis):** looks like a propagation delay between the Halcyon
dashboard and their senders. Recommend scheduling the next rotation during a quiet
window and accepting ~20 minutes of rejections.

**Action items:** none taken.
