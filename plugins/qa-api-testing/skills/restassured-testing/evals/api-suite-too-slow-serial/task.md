# 14 minutes of waiting on the network, one test at a time

## Problem Description

The catalog API suite is 220 tests and takes just over 14 minutes on the build
agent. Almost all of that is waiting: each test is one or two HTTP calls to a
service that answers in about three seconds, and the agent's CPU sits close to
idle for the whole run. The agent has 8 cores.

Somebody tried to make the suite run several tests at a time last quarter. The
run got faster and completely untrustworthy: a scattering of `401`s in tests
that pass fine on their own, and at least one case where a test asserting the
catalog size failed because another test had just added an item. It was
reverted the same day and the note on the revert says "not thread safe, don't
retry this".

The reason nobody got further is that nothing in the module says which tests
can safely run alongside which. `CatalogIT` below is a representative slice:
most of it is independent reads, but `seedsPromoItem` and `deletesPromoItem`
work on the same record in sequence, and `listsAllItems` asserts a total that
those two disturb.

We would like the speed-up, but we're not doing it again unless the `401`
behaviour is explained rather than worked around.

## Output Specification

1. Make independent tests execute several at a time on the build agent, and say
   roughly what the wall clock should become.
2. Explain what produced the random `401`s in the earlier attempt. Name the
   thing in this code that caused them.
3. Fix that cause. The two tokens the suite uses must keep working.
4. Tests that genuinely cannot run alongside others must be handled
   individually - the presence of three such tests must not force the other 217
   back into single file.
5. Whatever turns concurrency on must be committed to the repository, not
   passed on the command line by whoever runs the build.

Out of scope: do not change any assertion or endpoint, and do not add or remove
tests.

## Input Files

Extract the following files before beginning.

=============== FILE: src/test/java/com/example/catalog/CatalogSupport.java ===============
package com.example.catalog;

import io.restassured.RestAssured;

final class CatalogSupport {

  private CatalogSupport() {
  }

  static void connect() {
    RestAssured.baseURI = System.getProperty("api.baseURI", "http://localhost:8080");
    RestAssured.basePath = "/v1";
  }

  static void asAdmin() {
    RestAssured.authentication = RestAssured.oauth2(System.getenv("ADMIN_TOKEN"));
  }

  static void asShopper() {
    RestAssured.authentication = RestAssured.oauth2(System.getenv("SHOPPER_TOKEN"));
  }
}

=============== FILE: src/test/java/com/example/catalog/CatalogIT.java ===============
package com.example.catalog;

import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;

class CatalogIT {

  @BeforeAll
  static void setup() {
    CatalogSupport.connect();
  }

  @Test
  @DisplayName("a shopper can read a product")
  void readsProduct() {
    CatalogSupport.asShopper();
    given().accept(ContentType.JSON).
    when().get("/products/SKU-1001").
    then().statusCode(200).body("product.sku", equalTo("SKU-1001"));
  }

  @Test
  @DisplayName("a shopper can read product reviews")
  void readsReviews() {
    CatalogSupport.asShopper();
    given().accept(ContentType.JSON).
    when().get("/products/SKU-1001/reviews").
    then().statusCode(200).body("reviews", hasSize(greaterThan(0)));
  }

  @Test
  @DisplayName("a shopper can read the brand facet")
  void readsBrandFacet() {
    CatalogSupport.asShopper();
    given().accept(ContentType.JSON).
    when().get("/facets/brand").
    then().statusCode(200).body("values", hasSize(greaterThan(0)));
  }

  @Test
  @DisplayName("an admin can add the promo item")
  void seedsPromoItem() {
    CatalogSupport.asAdmin();
    given().accept(ContentType.JSON).contentType(ContentType.JSON).
        body("{\"sku\":\"SKU-PROMO\",\"name\":\"Promo kettle\",\"price_cents\":1}").
    when().post("/products").
    then().statusCode(201).body("product.sku", equalTo("SKU-PROMO"));
  }

  @Test
  @DisplayName("an admin can delete the promo item")
  void deletesPromoItem() {
    CatalogSupport.asAdmin();
    given().accept(ContentType.JSON).
    when().delete("/products/SKU-PROMO").
    then().statusCode(204);
  }

  @Test
  @DisplayName("the catalog reports its full size")
  void listsAllItems() {
    CatalogSupport.asShopper();
    given().accept(ContentType.JSON).
    when().get("/products").
    then().statusCode(200).body("total", equalTo(412));
  }
}

=============== FILE: pom.xml ===============
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.acme</groupId>
  <artifactId>catalog-api-tests</artifactId>
  <version>5.2.0-SNAPSHOT</version>

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
