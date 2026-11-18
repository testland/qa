# Provider notes

- The provider follows the Standard Webhooks spec: headers `webhook-id`, `webhook-timestamp`,
  `webhook-signature`.
- They will rotate our signing secret next week. For 24 hours both the old and the new secret
  will sign every delivery.
- Every delivery currently fails with 401.
