# The provider reshaped the response and our tests didn't notice

## Problem Description

The search team shipped a response change three sprints ago and we found out
from a customer. Three things changed at once:

- `total_count` was renamed to `totalCount`.
- `price_cents` (an integer) became `price` (a string like `"42.00"`).
- `facets` started coming back as `null` instead of an empty array.

`SearchApiIT` was green through all of it, because the assertions only cover
the handful of fields the original author cared about, and none of the three
were among them. Our client code then blew up in production on all three.

The obvious reaction is to write an assertion for every field of every
response, and we've started down that road - the file is already the longest
in the module and it is only two endpoints. It will not survive being applied
to the other eleven, and reviewing a pull request that adds forty
one-line assertions is not a real review.

What we actually want is one check per endpoint that says "this is the shape we
were built against", living in something a reviewer can read and diff on its
own, so that a rename, a type change, or a null where a collection belongs is a
red build. The existing behavioural assertions - the ones that check specific
values we care about - should stay.

## Output Specification

1. Add a per-endpoint shape check to both tests in `SearchApiIT` that fails on
   a renamed field, a changed field type, or a null where a collection is
   expected.
2. The shape definition must live in its own reviewable file, not inline in
   Java.
3. Keep every existing assertion in the file.
4. Show, for each of the three changes above, why the new check goes red.
5. You may add build dependencies if you need them.

Out of scope: the other eleven endpoints. Do not add new test methods or new
HTTP calls.

## Input Files

Extract the following files before beginning.

=============== FILE: src/test/java/com/example/search/SearchApiIT.java ===============
package com.example.search;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;

class SearchApiIT {

  @BeforeAll
  static void setup() {
    RestAssured.baseURI = System.getProperty("api.baseURI", "http://localhost:8080");
  }

  @Test
  @DisplayName("a product search returns scored hits")
  void searchesProducts() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
        queryParam("q", "kettle").
    when().
        get("/v1/search/products").
    then().
        statusCode(200).
        contentType(ContentType.JSON).
        body("query", equalTo("kettle")).
        body("hits", hasSize(greaterThan(0))).
        body("hits[0].sku", equalTo("SKU-1001"));
  }

  @Test
  @DisplayName("a suggestion lookup returns ranked terms")
  void suggestsTerms() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
        queryParam("prefix", "ket").
    when().
        get("/v1/search/suggest").
    then().
        statusCode(200).
        contentType(ContentType.JSON).
        body("suggestions", hasSize(greaterThan(0))).
        body("suggestions[0].term", equalTo("kettle"));
  }
}

=============== FILE: docs/search-api-responses.md ===============
# Search API - response shapes we build against

`GET /v1/search/products?q=kettle`

```json
{
  "query": "kettle",
  "total_count": 2,
  "facets": [
    { "name": "brand", "count": 2 }
  ],
  "hits": [
    { "sku": "SKU-1001", "score": 0.91, "price_cents": 4200, "in_stock": true },
    { "sku": "SKU-1044", "score": 0.55, "price_cents": 3100, "in_stock": false }
  ]
}
```

`GET /v1/search/suggest?prefix=ket`

```json
{
  "prefix": "ket",
  "suggestions": [
    { "term": "kettle", "weight": 91 },
    { "term": "ketchup", "weight": 12 }
  ]
}
```

=============== FILE: pom.xml ===============
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.acme</groupId>
  <artifactId>search-api-tests</artifactId>
  <version>3.1.0-SNAPSHOT</version>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>io.rest-assured</groupId>
      <artifactId>rest-assured</artifactId>
      <version>6.0.0</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.10.2</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <artifactId>maven-failsafe-plugin</artifactId>
        <version>3.2.5</version>
        <executions>
          <execution>
            <goals>
              <goal>integration-test</goal>
              <goal>verify</goal>
            </goals>
          </execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>
