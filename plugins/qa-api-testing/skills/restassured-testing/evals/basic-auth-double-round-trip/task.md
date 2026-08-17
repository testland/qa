# Every authenticated test broke after the gateway migration

## Problem Description

We moved the billing API behind a new gateway last Thursday. Since then every
test in `InvoiceApiIT` fails with `401`, while the same credentials work fine
from `curl` and from the mobile client. Nothing in the test module changed in
that release.

The gateway team sent us this from their access log for one test run. Note that
there are two entries for each single call our test makes:

```
10.4.2.19 "GET /v1/invoices/INV-2200" 401 0.004s auth=absent
10.4.2.19 "GET /v1/invoices/INV-2200" 401 0.004s auth=absent
```

They also pointed out that unlike the old server, their gateway answers an
unauthenticated request with a bare `401` and does not send back a
`WWW-Authenticate` header, because the platform team turned that off as part of
a fingerprinting-reduction change and will not turn it back on.

Separately, our SRE has been asking us to stop doubling the request count on
the billing service during the nightly run - our suite shows up as roughly
twice its real size in their dashboards, and it has been that way for as long
as anyone remembers.

## Output Specification

1. Make the authenticated tests pass against a gateway that never issues a
   challenge.
2. Each authenticated test must produce one request to the billing service, not
   two.
3. State, in one short paragraph, why these tests worked against the old server
   and fail against the gateway.
4. Credentials must keep coming from the same place they come from now.

Out of scope: do not change any assertion or endpoint, do not add or remove
test cases, and do not touch `pom.xml`.

## Input Files

Extract the following files before beginning.

=============== FILE: src/test/java/com/example/billing/InvoiceApiIT.java ===============
package com.example.billing;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;

class InvoiceApiIT {

  private static String user;
  private static String password;

  @BeforeAll
  static void setup() {
    RestAssured.baseURI = System.getProperty("api.baseURI", "http://localhost:8080");
    user = System.getenv("BILLING_SVC_USER");
    password = System.getenv("BILLING_SVC_PASSWORD");
  }

  @Test
  @DisplayName("an issued invoice can be fetched by id")
  void fetchesInvoice() {
    given().
        auth().basic(user, password).
        accept(ContentType.JSON).
    when().
        get("/v1/invoices/INV-2200").
    then().
        statusCode(200).
        body("invoice_id", equalTo("INV-2200")).
        body("state", equalTo("issued")).
        body("lines", hasSize(greaterThan(0)));
  }

  @Test
  @DisplayName("invoices can be listed for an account")
  void listsInvoicesForAccount() {
    given().
        auth().basic(user, password).
        accept(ContentType.JSON).
        queryParam("account_id", "ACC-77").
    when().
        get("/v1/invoices").
    then().
        statusCode(200).
        body("invoices.invoice_id", hasSize(greaterThan(0)));
  }

  @Test
  @DisplayName("a draft invoice can be voided")
  void voidsDraftInvoice() {
    given().
        auth().basic(user, password).
        accept(ContentType.JSON).
        contentType(ContentType.JSON).
        body("{\"reason\":\"duplicate\"}").
    when().
        post("/v1/invoices/INV-2201/void").
    then().
        statusCode(200).
        body("state", equalTo("void"));
  }

  @Test
  @DisplayName("the health endpoint is open to anonymous callers")
  void healthIsAnonymous() {
    given().
        accept(ContentType.JSON).
    when().
        get("/health").
    then().
        statusCode(200).
        body("status", equalTo("ok"));
  }
}
