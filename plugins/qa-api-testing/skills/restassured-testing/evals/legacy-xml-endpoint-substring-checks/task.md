# Nine policy tests broke because the vendor reformatted their output

## Problem Description

The policy service is a legacy system that answers in XML. Last Tuesday the
vendor upgraded their serializer. No field changed value, but the output is now
pretty-printed, empty elements come back self-closed, and attributes come out
in a different order. Nine of our tests went red immediately with
`org.opentest4j.AssertionFailedError: expected: <true> but was: <false>` and no
indication of which check failed - we had to add print statements to find out.

While fixing those we found something worse. `underwritingDecisionIsApproved`
has been passing for months regardless of the actual decision. The response
carries an `<auditTrail>` whose entries quote the decision text, so the string
we look for is in the document even when the policy was declined. We confirmed
it by pointing the test at a declined policy - still green.

`PolicyServiceIT` below is the five checks that matter, condensed from the nine.
The team's first instinct was to record a known-good response and compare
against it, which is what we already do for the orders API and which everyone
hates for the same reasons.

## Output Specification

1. Rework `PolicyServiceIT` so each check is tied to a specific place in the
   document rather than to text appearing somewhere in it.
2. Reformatting - indentation, self-closing empty elements, attribute order -
   must not affect the outcome.
3. A failing check must say which part of the document was wrong.
4. The decision check must fail when the decision element says something other
   than `APPROVED`, regardless of what the audit trail contains.
5. Keep all five checks and the single HTTP call.

Out of scope: no new dependencies - work with what the module already has. Do
not change the endpoint.

## Input Files

Extract the following files before beginning.

=============== FILE: src/test/java/com/example/policy/PolicyServiceIT.java ===============
package com.example.policy;

import io.restassured.RestAssured;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PolicyServiceIT {

  private static String document;

  @BeforeAll
  static void setup() {
    RestAssured.baseURI = System.getProperty("api.baseURI", "http://localhost:8080");
    document = given().
        auth().preemptive().basic(System.getenv("POLICY_USER"), System.getenv("POLICY_PASSWORD")).
    when().
        get("/policies/POL-1001").
    then().
        statusCode(200).
    extract().asString();
  }

  @Test
  @DisplayName("the policy is active")
  void policyIsActive() {
    assertTrue(document.contains("<status>ACTIVE</status>"));
  }

  @Test
  @DisplayName("the policy holder surname is correct")
  void holderSurname() {
    assertTrue(document.contains("<lastName>Lovelace</lastName>"));
  }

  @Test
  @DisplayName("the coverage is comprehensive")
  void coverageType() {
    assertTrue(document.contains("type=\"COMPREHENSIVE\""));
  }

  @Test
  @DisplayName("the coverage limit is five thousand euro")
  void coverageLimit() {
    assertTrue(document.contains("<limitCents>500000</limitCents>"));
  }

  @Test
  @DisplayName("underwriting approved the policy")
  void underwritingDecisionIsApproved() {
    assertTrue(document.contains("APPROVED"));
  }
}

=============== FILE: docs/policy-service-sample.xml ===============
<policy id="POL-1001" version="3">
  <status>ACTIVE</status>
  <holder>
    <firstName>Ada</firstName>
    <lastName>Lovelace</lastName>
  </holder>
  <coverage type="COMPREHENSIVE">
    <limitCents>500000</limitCents>
    <excessCents>0</excessCents>
  </coverage>
  <underwriting>
    <decision>APPROVED</decision>
    <reviewedBy>uw.system</reviewedBy>
  </underwriting>
  <auditTrail>
    <entry actor="uw.system" note="APPROVED after manual review"/>
    <entry actor="ops.batch" note="renewal notice queued"/>
  </auditTrail>
</policy>

=============== FILE: pom.xml ===============
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.acme</groupId>
  <artifactId>policy-api-tests</artifactId>
  <version>4.0.1-SNAPSHOT</version>

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
