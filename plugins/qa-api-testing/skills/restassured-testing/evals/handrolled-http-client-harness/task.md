# Sixty lines of plumbing per endpoint and nobody reviews it

## Problem Description

The inventory test module is written directly against the JDK HTTP client with
JSON parsing by hand. Three endpoints cost us about a hundred lines, most of
which is request construction and walking down a parsed tree to get at one
value.

Two problems with it, both raised in the last retro:

Nobody can review it. In a pull request the reviewer sees a request being
assembled at the top, a response being taken apart at the bottom, and has to
hold the middle in their head to work out what is actually being asserted.
Adding the fourth endpoint took a day, most of it spent copying and adapting
the existing plumbing.

When it fails, the message is `expected: <200> but was: <503>` or
`java.lang.NullPointerException: Cannot invoke "JsonNode.asText()" because the
return value of "JsonNode.get(String)" is null`. Neither says which request,
which field, or what came back.

There are also two different ways of getting at a nested value in the file
already, because two people wrote two helpers a month apart, and every method
signature carries `throws Exception`.

The module already has a client library on its dependency list - it was added
last sprint for a spike that never landed - so you do not need to introduce
anything new.

## Output Specification

1. Rewrite the three tests so that each one reads as one thing: the request
   that goes out, the call, and the expectations on what comes back.
2. Get rid of the hand-written JSON navigation and the two competing helpers.
3. No `throws` clauses on the test methods.
4. Keep the same three behaviours and the same expected values - list them in
   your answer so a reviewer can confirm nothing was lost.
5. The credential must keep coming from the environment.

Out of scope: do not add dependencies beyond what `pom.xml` already declares,
and do not change the endpoints or the request payloads.

## Input Files

Extract the following files before beginning.

=============== FILE: src/test/java/com/example/inventory/StockLevelsIT.java ===============
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

=============== FILE: pom.xml ===============
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.acme</groupId>
  <artifactId>inventory-api-tests</artifactId>
  <version>2.0.0-SNAPSHOT</version>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>io.rest-assured</groupId>
      <artifactId>rest-assured</artifactId>
      <version>6.0.0</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>com.fasterxml.jackson.core</groupId>
      <artifactId>jackson-databind</artifactId>
      <version>2.17.1</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.10.2</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <artifactId>maven-failsafe-plugin</artifactId>
        <version>3.2.5</version>
        <executions>
          <execution>
            <goals>
              <goal>integration-test</goal>
              <goal>verify</goal>
            </goals>
          </execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>
