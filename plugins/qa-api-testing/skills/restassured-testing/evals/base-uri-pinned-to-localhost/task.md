# The API suite can only ever be pointed at one environment

## Problem Description

Our payments API test module has two test classes and each one decides for
itself which server to talk to. `CheckoutIT` talks to staging, `RefundsIT`
talks to whatever is on the developer's laptop, and one of the checkout tests
has the full staging host written into the request line itself.

When we need to run the suite against a different environment, somebody edits
the source, runs it, and then usually forgets to revert. We have had two PRs
this quarter whose only content was flipping those strings back, and one where
a staging host got shipped as the default and nobody noticed for a week.

Release is now a single PowerShell step on a Windows agent that runs the same
built test module three times back to back - against `dev`, `staging`, and
`prod-canary` - and it cannot rebuild, patch, or re-checkout sources between
the three runs. So the environment has to be chosen per invocation of the
build, not per file and not per machine.

At the same time, a developer who clones the repo and runs the build with no
extra arguments should still get the local server on port 8080, because that
is what our contributor guide tells them to start first.

## Output Specification

1. Rework both test classes so the target host is supplied to the build at
   invocation time rather than living in the source.
2. With nothing supplied, the suite must target `http://localhost:8080`.
3. No environment hostname may remain as a literal anywhere under
   `src/test/java` - including inside request paths.
4. Both classes must resolve the host the same way; a reviewer should be able
   to point at one mechanism rather than two.
5. Show the exact commands the release step would run for the three
   environments.

Out of scope: do not change any assertion, do not rename or split the test
classes, and do not add test cases.

## Input Files

Extract the following files before beginning.

=============== FILE: src/test/java/com/example/checkout/CheckoutIT.java ===============
package com.example.checkout;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;

class CheckoutIT {

  @BeforeAll
  static void setup() {
    RestAssured.baseURI = "https://staging.acme-pay.internal";
  }

  @Test
  @DisplayName("a checkout session can be created")
  void createsSession() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
        body("{\"cart_id\":\"CART-9001\",\"currency\":\"EUR\"}").
        contentType(ContentType.JSON).
    when().
        post("/v1/checkout/sessions").
    then().
        statusCode(201).
        body("cart_id", equalTo("CART-9001")).
        body("state", equalTo("open"));
  }

  @Test
  @DisplayName("an existing checkout session lists its line items")
  void listsLineItems() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
    when().
        get("https://staging.acme-pay.internal/v1/checkout/sessions/CS-1001/items").
    then().
        statusCode(200).
        body("items", hasSize(greaterThan(0))).
        body("items[0].currency", equalTo("EUR"));
  }
}

=============== FILE: src/test/java/com/example/checkout/RefundsIT.java ===============
package com.example.checkout;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

class RefundsIT {

  @BeforeAll
  static void setup() {
    RestAssured.baseURI = "http://localhost:8080";
  }

  @Test
  @DisplayName("a settled payment can be refunded in full")
  void fullRefund() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
        contentType(ContentType.JSON).
        body("{\"payment_id\":\"PAY-4410\",\"amount\":null}").
    when().
        post("/v1/refunds").
    then().
        statusCode(201).
        body("payment_id", equalTo("PAY-4410")).
        body("refund_id", notNullValue()).
        body("state", equalTo("pending"));
  }
}

=============== FILE: pom.xml ===============
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.acme</groupId>
  <artifactId>payments-api-tests</artifactId>
  <version>1.0.0-SNAPSHOT</version>

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
