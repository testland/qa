package com.example.catalog;

import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;

class CatalogIT {

  @BeforeAll
  static void setup() {
    CatalogSupport.connect();
  }

  @Test
  @DisplayName("a shopper can read a product")
  void readsProduct() {
    CatalogSupport.asShopper();
    given().accept(ContentType.JSON).
    when().get("/products/SKU-1001").
    then().statusCode(200).body("product.sku", equalTo("SKU-1001"));
  }

  @Test
  @DisplayName("a shopper can read product reviews")
  void readsReviews() {
    CatalogSupport.asShopper();
    given().accept(ContentType.JSON).
    when().get("/products/SKU-1001/reviews").
    then().statusCode(200).body("reviews", hasSize(greaterThan(0)));
  }

  @Test
  @DisplayName("a shopper can read the brand facet")
  void readsBrandFacet() {
    CatalogSupport.asShopper();
    given().accept(ContentType.JSON).
    when().get("/facets/brand").
    then().statusCode(200).body("values", hasSize(greaterThan(0)));
  }

  @Test
  @DisplayName("an admin can add the promo item")
  void seedsPromoItem() {
    CatalogSupport.asAdmin();
    given().accept(ContentType.JSON).contentType(ContentType.JSON).
        body("{\"sku\":\"SKU-PROMO\",\"name\":\"Promo kettle\",\"price_cents\":1}").
    when().post("/products").
    then().statusCode(201).body("product.sku", equalTo("SKU-PROMO"));
  }

  @Test
  @DisplayName("an admin can delete the promo item")
  void deletesPromoItem() {
    CatalogSupport.asAdmin();
    given().accept(ContentType.JSON).
    when().delete("/products/SKU-PROMO").
    then().statusCode(204);
  }

  @Test
  @DisplayName("the catalog reports its full size")
  void listsAllItems() {
    CatalogSupport.asShopper();
    given().accept(ContentType.JSON).
    when().get("/products").
    then().statusCode(200).body("total", equalTo(412));
  }
}
