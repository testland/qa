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
