package com.example.inventory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StockLevelsIT {

  private static final String BASE = System.getProperty("api.baseURI", "http://localhost:8080");
  private static final HttpClient CLIENT = HttpClient.newHttpClient();
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private static HttpResponse<String> get(String path) throws Exception {
    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(BASE + path))
        .header("Accept", "application/json")
        .header("Authorization", "Bearer " + System.getenv("API_TOKEN"))
        .GET()
        .build();
    return CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
  }

  private static JsonNode firstItem(String body) throws Exception {
    return MAPPER.readTree(body).get("items").get(0);
  }

  @Test
  @DisplayName("stock for a known sku")
  void stockForSku() throws Exception {
    HttpResponse<String> response = get("/v1/stock/SKU-1001");
    assertEquals(200, response.statusCode());
    JsonNode body = MAPPER.readTree(response.body());
    assertEquals("SKU-1001", body.get("sku").asText());
    assertEquals("WH-BER", body.get("warehouse").asText());
    assertTrue(body.get("on_hand").asInt() > 0);
  }

  @Test
  @DisplayName("stock listing for a warehouse")
  void stockForWarehouse() throws Exception {
    HttpResponse<String> response = get("/v1/stock?warehouse=WH-BER");
    assertEquals(200, response.statusCode());
    JsonNode first = firstItem(response.body());
    assertTrue(first.get("sku").asText().matches("^SKU-\\d{4}$"));
    assertTrue(MAPPER.readTree(response.body()).get("items").size() > 0);
  }

  @Test
  @DisplayName("a reservation can be held against available stock")
  void reservesStock() throws Exception {
    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(BASE + "/v1/stock/SKU-1001/reservations"))
        .header("Accept", "application/json")
        .header("Content-Type", "application/json")
        .header("Authorization", "Bearer " + System.getenv("API_TOKEN"))
        .POST(HttpRequest.BodyPublishers.ofString("{\"quantity\":2,\"order_id\":\"ORD-88\"}"))
        .build();
    HttpResponse<String> response = CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
    assertEquals(201, response.statusCode());
    JsonNode reservation = MAPPER.readTree(response.body()).path("reservation");
    assertNotNull(reservation.get("reservation_id"));
    assertEquals("held", reservation.get("state").asText());
    assertEquals(2, reservation.get("quantity").asInt());
  }
}
