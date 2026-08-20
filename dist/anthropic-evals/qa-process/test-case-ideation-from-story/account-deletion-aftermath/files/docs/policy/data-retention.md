# Data retention policy (extract, v4)

- **R1.** Database backups are retained for 90 days. Deletions propagate to
  backups only as those backups expire.
- **R2.** Invoices and tax records are retained for 7 years and are exempt from
  erasure requests. They keep the legal name and billing address.
- **R3.** Every privacy action (request, restore, completion) is written to the
  privacy audit log, which is retained for 6 years and records the account
  identifier, the actor and the timestamp.
- **R4.** Sub-processors — the product analytics provider, the email provider
  and the support desk — must each be issued a deletion instruction within 30
  days of the erasure completing.
- **R5.** Content the user created inside a shared workspace belongs to the
  workspace and is reassigned to the workspace owner, not erased.
