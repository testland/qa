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
