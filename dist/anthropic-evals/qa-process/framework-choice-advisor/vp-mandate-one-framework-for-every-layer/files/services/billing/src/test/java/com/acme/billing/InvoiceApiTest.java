package com.acme.billing;

import io.restassured.RestAssured;
import org.junit.jupiter.api.Test;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

class InvoiceApiTest {

    @Test
    void invoiceIsReturnedWithItsTotal() {
        RestAssured.baseURI = System.getenv("BILLING_BASE_URI");
        given()
            .header("Authorization", "Bearer " + System.getenv("BILLING_TOKEN"))
        .when()
            .get("/invoices/inv_2211")
        .then()
            .statusCode(200)
            .body("totalCents", equalTo(2500));
    }
}
