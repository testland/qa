package com.example.orders;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

class OrderSnapshotIT {

  private static String expected;

  @BeforeAll
  static void setup() throws Exception {
    RestAssured.baseURI = System.getProperty("api.baseURI", "http://localhost:8080");
    expected = Files.readString(
        Path.of("src/test/resources/expected/order-42.json"), StandardCharsets.UTF_8).trim();
  }

  @Test
  @DisplayName("GET /v1/orders/42 matches the recorded snapshot")
  void orderMatchesSnapshot() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
    when().
        get("/v1/orders/42").
    then().
        statusCode(200).
        body(equalTo(expected));
  }
}
