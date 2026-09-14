package com.example.load;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;
import java.time.Duration;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

public class SignupSimulation extends Simulation {

  HttpProtocolBuilder httpProtocol = http
    .baseUrl("https://staging.northwind-signup.internal")
    .acceptHeader("application/json");

  ScenarioBuilder signup = scenario("Merchant signup")
    .exec(
      http("Get token")
        .post("/auth/token")
        .body(StringBody("{\"client_id\":\"loadtest\",\"client_secret\":\"loadtest\"}"))
        .check(status().is(200))
        .check(jsonPath("$.access_token").saveAs("token"))
    )
    .exec(
      http("Create merchant")
        .post("/v1/merchants")
        .header("Authorization", "Bearer #{token}")
        .body(StringBody("{\"name\":\"Acme Trading\",\"country\":\"GB\",\"mcc\":\"5732\"}"))
        .check(status().is(201))
        .check(jsonPath("$.merchant_id").saveAs("merchantId"))
    )
    .exec(
      http("Submit KYC")
        .post("/v1/merchants/#{merchantId}/kyc")
        .header("Authorization", "Bearer #{token}")
        .body(StringBody("{\"doc_type\":\"passport\",\"doc_ref\":\"P-000001\"}"))
        .check(status().is(202))
    );

  {
    setUp(
      signup.injectClosed(
        rampConcurrentUsers(0).to(500).during(Duration.ofMinutes(2)),
        constantConcurrentUsers(500).during(Duration.ofMinutes(12))
      )
    )
    .protocols(httpProtocol)
    .assertions(
      global().failedRequests().percent().lt(1.0)
    );
  }
}
