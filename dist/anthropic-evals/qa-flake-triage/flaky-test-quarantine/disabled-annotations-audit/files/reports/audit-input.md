# git log + nightly history for OrderServiceIT

| Test                          | Turned off  | Last touched | Nightly runs | Failures | Rate  |
|-------------------------------|-------------|--------------|--------------|----------|-------|
| refundPostsToLedger           | 2026-06-22  | 2026-06-22   | 90 (nightly) | 20       | 22.2% |
| bulkImportHandlesDuplicates   | 2026-07-30  | 2026-07-30   | 90 (nightly) | 8        | 8.9%  |
| webhookRetriesOnGatewayTimeout| 2026-04-02  | 2026-04-02   | 90 (nightly) | 0        | 0.0%  |
| legacyXmlExportMatchesSchema  | 2025-06-11  | 2025-06-11   | not run      | —        | —     |

Notes gathered:

- refundPostsToLedger: turned off by @kdavies the day before the 5.3 freeze. No
  ticket was opened. The refund path is still shipped and still changing.
- bulkImportHandlesDuplicates: @tobrien turned it off; the duplicate-detection
  race is understood but unfixed, ticket #5502 is open and unassigned.
- webhookRetriesOnGatewayTimeout: infra ticket #221 was closed as done on
  2026-05-14. Nightly has passed it 90 times since.
- legacyXmlExportMatchesSchema: the legacy XML export endpoint was withdrawn in
  the 4.9 release (2025-08-30). `exportLegacyXml` no longer exists on the
  service.

Owners: order/refund surfaces @web-platform (lead @kdavies); import and
webhooks @integrations (lead @tobrien).
