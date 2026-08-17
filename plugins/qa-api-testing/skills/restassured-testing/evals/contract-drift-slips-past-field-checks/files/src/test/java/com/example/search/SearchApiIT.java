package com.example.search;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;

class SearchApiIT {

  @BeforeAll
  static void setup() {
    RestAssured.baseURI = System.getProperty("api.baseURI", "http://localhost:8080");
  }

  @Test
  @DisplayName("a product search returns scored hits")
  void searchesProducts() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
        queryParam("q", "kettle").
    when().
        get("/v1/search/products").
    then().
        statusCode(200).
        contentType(ContentType.JSON).
        body("query", equalTo("kettle")).
        body("hits", hasSize(greaterThan(0))).
        body("hits[0].sku", equalTo("SKU-1001"));
  }

  @Test
  @DisplayName("a suggestion lookup returns ranked terms")
  void suggestsTerms() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
        queryParam("prefix", "ket").
    when().
        get("/v1/search/suggest").
    then().
        statusCode(200).
        contentType(ContentType.JSON).
        body("suggestions", hasSize(greaterThan(0))).
        body("suggestions[0].term", equalTo("kettle"));
  }
}
