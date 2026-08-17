# "Tests run: 118, Failures: 3" is everything CI tells us

## Problem Description

Our API job on pull requests is close to useless. When it fails, the entire
signal is the Maven summary line - `Tests run: 118, Failures: 3, Errors: 0` -
and to find out which three, you have to reproduce the run locally against
staging and hope you get the same three. Reviewers have stopped looking at it.

When the job finishes, everything it produced is gone. There is nothing to open
after the fact, failed run or successful one.

Three more things surfaced in the last security review and the last incident
review:

- The staging token is written into the workflow file. It is in the git history
  and it is being rotated this week.
- The job runs against `https://api.acme.com`, which is production. That was
  meant to be temporary during a staging outage in March.
- Someone added `continue-on-error: true` in April because the job was red for
  a week, and nobody removed it, so a failing suite has been reporting success
  ever since.

The job also spends about four minutes of every run downloading dependencies.

The Java side is fine - `PricingIT` already takes its host and its credential
from outside the source, and the build is already wired to run the HTTP tests
in the later phase. This is a CI problem only.

## Output Specification

Rewrite `.github/workflows/api-tests.yml` so that:

1. A reviewer can see which individual tests failed from the pull request,
   without opening raw logs or re-running anything locally.
2. Whatever the run produces is retrievable afterwards, including - especially -
   when the run failed.
3. The credential comes from the repository's secret store.
4. The run targets staging (`https://staging.acme.internal`), not production.
5. Dependency downloads are not repeated on every run.
6. A failing suite fails the job.

Keep Java 21. Do not change `PricingIT.java` or `pom.xml`.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/api-tests.yml ===============
name: api-tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  api:
    runs-on: ubuntu-latest
    continue-on-error: true
    env:
      API_TOKEN: "sk_live_9f3a71c4de8842b0a1"
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'

      - name: Run API tests
        run: mvn -q verify -Dapi.baseURI=https://api.acme.com

=============== FILE: src/test/java/com/example/pricing/PricingIT.java ===============
package com.example.pricing;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;

class PricingIT {

  @BeforeAll
  static void setup() {
    RestAssured.baseURI = System.getProperty("api.baseURI", "http://localhost:8080");
  }

  @Test
  @DisplayName("a list price is returned for a known sku")
  void listPrice() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
    when().
        get("/v1/prices/SKU-1001").
    then().
        statusCode(200).
        contentType(ContentType.JSON).
        body("sku", equalTo("SKU-1001")).
        body("amount_cents", greaterThan(0));
  }
}

=============== FILE: pom.xml ===============
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.acme</groupId>
  <artifactId>pricing-api-tests</artifactId>
  <version>1.9.0-SNAPSHOT</version>

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
