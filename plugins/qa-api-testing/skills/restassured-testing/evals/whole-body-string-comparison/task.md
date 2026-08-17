# When this test fails nobody can tell what changed

## Problem Description

`OrderSnapshotIT` compares the whole response body of `GET /v1/orders/42`
against a checked-in file. It fails most mornings, and when it does the CI log
contains two four-kilobyte JSON blobs and the word `expected`. Working out
what actually differs means copying both blobs into a diff tool.

The daily failures are all the same three fields - the order carries a
`created_at`, a `trace_id`, and an `etag` that change on every deploy of the
service, and one of them changes on every read. Nobody disputes those fields
should be there; they just can't be pinned to a value.

The team's habit is now to re-run the test, and if it fails again, regenerate
`expected/order-42.json` from the live response and commit it. That has twice
swallowed a real change: once when `status` silently started coming back as
`"SHIPPED"` instead of `"shipped"`, and once when the `items[].sku` format
changed and we shipped a client that couldn't parse it.

## Output Specification

1. Rework `OrderSnapshotIT` so a failure names the field that changed rather
   than printing the whole document.
2. The three volatile fields must not be able to fail the build on their value,
   but their absence or a malformed value must still fail.
3. Keep coverage of every field the current comparison covers - list them in
   your answer so a reviewer can check nothing was dropped.
4. Remove or demote `expected/order-42.json` if it is no longer authoritative,
   and say what should happen the next time somebody's instinct is to
   regenerate it.

Out of scope: `pom.xml` is frozen - no new dependencies, no new plugins. Do not
change the endpoint or add HTTP calls.

## Input Files

Extract the following files before beginning.

=============== FILE: src/test/java/com/example/orders/OrderSnapshotIT.java ===============
package com.example.orders;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

class OrderSnapshotIT {

  private static String expected;

  @BeforeAll
  static void setup() throws Exception {
    RestAssured.baseURI = System.getProperty("api.baseURI", "http://localhost:8080");
    expected = Files.readString(
        Path.of("src/test/resources/expected/order-42.json"), StandardCharsets.UTF_8).trim();
  }

  @Test
  @DisplayName("GET /v1/orders/42 matches the recorded snapshot")
  void orderMatchesSnapshot() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
    when().
        get("/v1/orders/42").
    then().
        statusCode(200).
        body(equalTo(expected));
  }
}

=============== FILE: src/test/resources/expected/order-42.json ===============
{
  "order_id": 42,
  "customer_id": "CUST-9",
  "status": "shipped",
  "currency": "EUR",
  "total_cents": 5100,
  "created_at": "2026-08-11T09:14:02Z",
  "trace_id": "f0b1c2d3-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
  "etag": "W/\"7c1f-19812ab\"",
  "shipping": {
    "carrier": "DPD",
    "tracking_number": "DPD-8891023",
    "country": "DE"
  },
  "items": [
    { "sku": "AB12CD34", "quantity": 2, "unit_price_cents": 1800 },
    { "sku": "EF56GH78", "quantity": 1, "unit_price_cents": 1500 }
  ]
}
