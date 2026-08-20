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
