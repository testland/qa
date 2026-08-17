# The suite stayed green through a three-day outage

## Problem Description

Last week a config change pointed our catalog service at an empty read replica.
For three days `/v1/products` returned `200 OK` with `{"products":[]}` and
`/v1/products/{sku}` returned `200 OK` with `{"product":null}`. The API test
module ran on every merge and every nightly and never went red once. Support
found it before we did.

While we were digging into that we found a second thing. The
`/v1/products/SKU-1001/reviews` endpoint had been fronted by an error page for
about a day - it was answering `200 OK` with an HTML body from the CDN, not
JSON at all - and that also passed.

The module is `CatalogIT`. Reading it, every test does the same thing: fire the
request, check the number that comes back, done. Nobody wants to go back to the
enormous fixture-file comparisons we had two years ago, which were unreadable
when they failed and got regenerated whenever they broke.

## Output Specification

1. Rework `CatalogIT` so each of the four tests fails when the endpoint answers
   with an empty or missing payload.
2. The reviews test must also fail if the response stops being JSON.
3. Keep the same four endpoints and the same number of HTTP calls - this is
   about what is checked, not about testing more surface.
4. For each test, state in one line which of the two incidents it would have
   caught.

Out of scope: `pom.xml` is frozen this sprint - no new dependencies. Do not add
new test methods.

## Input Files

Extract the following files before beginning.

=============== FILE: src/test/java/com/example/catalog/CatalogIT.java ===============
package com.example.catalog;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;

class CatalogIT {

  @BeforeAll
  static void setup() {
    RestAssured.baseURI = System.getProperty("api.baseURI", "http://localhost:8080");
  }

  @Test
  @DisplayName("the product list responds")
  void listsProducts() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
    when().
        get("/v1/products").
    then().
        statusCode(200);
  }

  @Test
  @DisplayName("a single product responds")
  void fetchesProduct() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
    when().
        get("/v1/products/SKU-1001").
    then().
        statusCode(200);
  }

  @Test
  @DisplayName("product reviews respond")
  void fetchesReviews() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
    when().
        get("/v1/products/SKU-1001/reviews").
    then().
        statusCode(200);
  }

  @Test
  @DisplayName("a search responds")
  void searches() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
        queryParam("q", "kettle").
    when().
        get("/v1/search").
    then().
        statusCode(200);
  }
}

=============== FILE: docs/catalog-api-sample-responses.md ===============
# Catalog API - sample successful responses

`GET /v1/products`

```json
{
  "products": [
    { "sku": "SKU-1001", "name": "Stovetop kettle", "price_cents": 4200, "in_stock": true },
    { "sku": "SKU-1002", "name": "Pour-over filter", "price_cents": 900, "in_stock": false }
  ],
  "page": 1,
  "total": 2
}
```

`GET /v1/products/SKU-1001`

```json
{
  "product": { "sku": "SKU-1001", "name": "Stovetop kettle", "price_cents": 4200, "in_stock": true }
}
```

`GET /v1/products/SKU-1001/reviews`

```json
{
  "reviews": [
    { "review_id": "RV-7", "rating": 4, "author": "j.doe" }
  ],
  "average_rating": 4.0
}
```

`GET /v1/search?q=kettle`

```json
{
  "hits": [
    { "sku": "SKU-1001", "score": 0.91 }
  ],
  "query": "kettle"
}
```
