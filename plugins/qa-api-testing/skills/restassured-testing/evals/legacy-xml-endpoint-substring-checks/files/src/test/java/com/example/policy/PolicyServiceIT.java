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
