package com.example.catalog;

import io.restassured.RestAssured;

final class CatalogSupport {

  private CatalogSupport() {
  }

  static void connect() {
    RestAssured.baseURI = System.getProperty("api.baseURI", "http://localhost:8080");
    RestAssured.basePath = "/v1";
  }

  static void asAdmin() {
    RestAssured.authentication = RestAssured.oauth2(System.getenv("ADMIN_TOKEN"));
  }

  static void asShopper() {
    RestAssured.authentication = RestAssured.oauth2(System.getenv("SHOPPER_TOKEN"));
  }
}
