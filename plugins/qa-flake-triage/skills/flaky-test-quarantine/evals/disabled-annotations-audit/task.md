# Auditing what our integration suite is actually not running

## Problem Description

Compliance asked for a list of integration tests that do not execute, and I
could not produce one. Our Java suite uses `@Disabled` in some places, a
commented-out block in one place, and one test that is annotated but whose
reason is a person's name and nothing else.

I ran a git log over the file to get dates and the last commit that touched
each of them, and I pulled the failure history for the ones that still run
sometimes on the nightly job. Both are attached, along with what I could find
out about the tickets referenced.

Today is 2026-08-17. The suite is JUnit 5.

What compliance actually wants is not the list, it is confidence that a test
being off is a decision somebody made with an end in sight, and not something
that happened. Right now I cannot demonstrate that for any of the five.

## Output Specification

1. Produce `src/test/java/com/example/OrderServiceIT.java` in the state you
   would commit.
2. Write `docs/disabled-tests.md` — the list compliance asked for, one row per
   test that does not execute after your change, with enough per row that
   somebody outside the team can see the decision and its end point.
3. Anything you conclude should no longer be in the file must actually be
   removed from it, not left commented out.

## Input Files

Extract the following files before beginning.

=============== FILE: src/test/java/com/example/OrderServiceIT.java ===============
package com.example;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class OrderServiceIT {

    @Test
    @Disabled
    void refundPostsToLedger() {
        var order = OrderFixtures.captured(4900);
        var result = service.refund(order.id());
        assertEquals("refunded", result.status());
        assertEquals(-4900, ledger.lastEntry().amountCents());
    }

    @Test
    @Disabled("flaky")
    void bulkImportHandlesDuplicates() {
        var report = service.bulkImport(Fixtures.csvWithDuplicates());
        assertEquals(312, report.accepted());
        assertEquals(4, report.rejectedDuplicates());
    }

    @Test
    @Disabled("waiting on infra ticket #221")
    void webhookRetriesOnGatewayTimeout() {
        var delivery = service.deliverWebhook(Fixtures.orderCreated());
        assertEquals(3, delivery.attempts());
    }

    // @Test
    // void legacyXmlExportMatchesSchema() {
    //     var xml = service.exportLegacyXml(OrderFixtures.captured(4900));
    //     assertTrue(SchemaValidator.validate(xml, "orders-v2.xsd"));
    // }

    @Test
    void orderTotalsIncludeTax() {
        var order = OrderFixtures.captured(4900);
        assertEquals(5390, service.totalWithTax(order).cents());
    }
}

=============== FILE: reports/audit-input.md ===============
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
