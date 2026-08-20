package com.example.billing;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;

class InvoiceApiIT {

  private static String user;
  private static String password;

  @BeforeAll
  static void setup() {
    RestAssured.baseURI = System.getProperty("api.baseURI", "http://localhost:8080");
    user = System.getenv("BILLING_SVC_USER");
    password = System.getenv("BILLING_SVC_PASSWORD");
  }

  @Test
  @DisplayName("an issued invoice can be fetched by id")
  void fetchesInvoice() {
    given().
        auth().basic(user, password).
        accept(ContentType.JSON).
    when().
        get("/v1/invoices/INV-2200").
    then().
        statusCode(200).
        body("invoice_id", equalTo("INV-2200")).
        body("state", equalTo("issued")).
        body("lines", hasSize(greaterThan(0)));
  }

  @Test
  @DisplayName("invoices can be listed for an account")
  void listsInvoicesForAccount() {
    given().
        auth().basic(user, password).
        accept(ContentType.JSON).
        queryParam("account_id", "ACC-77").
    when().
        get("/v1/invoices").
    then().
        statusCode(200).
        body("invoices.invoice_id", hasSize(greaterThan(0)));
  }

  @Test
  @DisplayName("a draft invoice can be voided")
  void voidsDraftInvoice() {
    given().
        auth().basic(user, password).
        accept(ContentType.JSON).
        contentType(ContentType.JSON).
        body("{\"reason\":\"duplicate\"}").
    when().
        post("/v1/invoices/INV-2201/void").
    then().
        statusCode(200).
        body("state", equalTo("void"));
  }

  @Test
  @DisplayName("the health endpoint is open to anonymous callers")
  void healthIsAnonymous() {
    given().
        accept(ContentType.JSON).
    when().
        get("/health").
    then().
        statusCode(200).
        body("status", equalTo("ok"));
  }
}
