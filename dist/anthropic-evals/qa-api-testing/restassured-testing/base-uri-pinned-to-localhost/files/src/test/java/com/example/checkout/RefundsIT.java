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
