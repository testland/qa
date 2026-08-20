package com.example.catalog;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;

class CatalogIT {

  @BeforeAll
  static void setup() {
    RestAssured.baseURI = System.getProperty("api.baseURI", "http://localhost:8080");
  }

  @Test
  @DisplayName("the product list responds")
  void listsProducts() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
    when().
        get("/v1/products").
    then().
        statusCode(200);
  }

  @Test
  @DisplayName("a single product responds")
  void fetchesProduct() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
    when().
        get("/v1/products/SKU-1001").
    then().
        statusCode(200);
  }

  @Test
  @DisplayName("product reviews respond")
  void fetchesReviews() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
    when().
        get("/v1/products/SKU-1001/reviews").
    then().
        statusCode(200);
  }

  @Test
  @DisplayName("a search responds")
  void searches() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
        queryParam("q", "kettle").
    when().
        get("/v1/search").
    then().
        statusCode(200);
  }
}
