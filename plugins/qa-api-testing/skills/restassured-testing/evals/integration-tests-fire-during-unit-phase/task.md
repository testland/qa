# A fresh clone can't run the test suite

## Problem Description

New joiner did the onboarding steps yesterday: clone, build, run the tests.
The build failed on her machine because half the tests try to open HTTP
connections to a server that isn't running. She spent the morning on it before
someone told her the trick.

The trick is that everyone passes `-Dtest='!*Api*'` locally, and it isn't
written down anywhere. Two people have a shell alias for it. One person got
tired and put `@Disabled` on `OrderApiTest.cancelsAnOrder` "just for the
afternoon" - it has been off for three weeks and we only noticed when a
cancellation bug reached production.

The same thing hurts CI. Our first pipeline stage is meant to be the fast one
that gives a signal in under a minute, and it takes nine minutes because it
opens connections to staging. If staging is down, the fast stage goes red for
reasons that have nothing to do with the change under review.

There are two kinds of test in this module and they are not distinguishable
from the outside: `OrderMapperTest` is pure in-process logic, `OrderApiTest`
talks HTTP.

## Output Specification

1. The default build's test phase must run only the tests that need nothing
   but a JVM - a fresh clone with no server and no network must go green.
2. One command must still run everything, HTTP tests included.
3. The split must be structural. It must not depend on a developer remembering
   a flag, keeping an alias, or annotating individual methods.
4. Say which command each pipeline stage should run.

Out of scope: do not change any test body, assertion, or endpoint - moving and
renaming files is fine, editing what they assert is not.

## Input Files

Extract the following files before beginning.

=============== FILE: pom.xml ===============
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.acme</groupId>
  <artifactId>orders</artifactId>
  <version>2.4.0-SNAPSHOT</version>

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
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.2.5</version>
      </plugin>
    </plugins>
  </build>
</project>

=============== FILE: src/test/java/com/example/orders/OrderMapperTest.java ===============
package com.example.orders;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OrderMapperTest {

  @Test
  @DisplayName("cents are rendered with two decimals")
  void formatsAmount() {
    assertEquals("51.00", OrderMapper.formatCents(5100));
  }

  @Test
  @DisplayName("an unknown carrier code maps to UNKNOWN")
  void mapsUnknownCarrier() {
    assertEquals("UNKNOWN", OrderMapper.carrierName("ZZ"));
  }
}

=============== FILE: src/test/java/com/example/orders/OrderApiTest.java ===============
package com.example.orders;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;

class OrderApiTest {

  @BeforeAll
  static void setup() {
    RestAssured.baseURI = System.getProperty("api.baseURI", "http://localhost:8080");
  }

  @Test
  @DisplayName("an order can be fetched by id")
  void fetchesOrder() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
    when().
        get("/v1/orders/42").
    then().
        statusCode(200).
        body("order_id", equalTo(42)).
        body("items", hasSize(greaterThan(0)));
  }

  @Disabled("flaky since 2026-07-24, re-enable after the staging refresh")
  @Test
  @DisplayName("a placed order can be cancelled")
  void cancelsAnOrder() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
    when().
        post("/v1/orders/43/cancel").
    then().
        statusCode(200).
        body("status", equalTo("cancelled"));
  }
}
