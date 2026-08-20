package com.example;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.equalToJson;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.options;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.github.tomakehurst.wiremock.WireMockServer;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;

class PaymentGatewayIT {

    static final int STUB_PORT = 8089;

    static WireMockServer paymentsStub;
    static GenericContainer<?> billing;
    static String billingBaseUrl;

    @BeforeAll
    static void startEverything() throws Exception {
        paymentsStub = new WireMockServer(options().port(STUB_PORT));
        paymentsStub.start();
        paymentsStub.stubFor(post(urlEqualTo("/charges"))
                .willReturn(aResponse()
                        .withStatus(201)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"id\":\"ch_123\",\"status\":\"succeeded\"}")));

        Thread.sleep(3000);

        billing = new GenericContainer<>("example/billing:test")
                .withExposedPorts(8080)
                .withEnv("PAYMENTS_BASE_URL", "http://localhost:" + STUB_PORT)
                .waitingFor(Wait.forHttp("/healthz")
                        .forStatusCode(200)
                        .withStartupTimeout(Duration.ofSeconds(60)));
        billing.start();

        billingBaseUrl = "http://" + billing.getHost() + ":" + billing.getMappedPort(8080);
    }

    @AfterAll
    static void stopEverything() {
        billing.stop();
        paymentsStub.stop();
    }

    @Test
    void chargesTheCardThroughThePaymentProvider() throws Exception {
        HttpResponse<String> response = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create(billingBaseUrl + "/invoices/inv-1/pay"))
                        .POST(HttpRequest.BodyPublishers.noBody())
                        .build(),
                HttpResponse.BodyHandlers.ofString());

        assertEquals(200, response.statusCode());
        paymentsStub.verify(postRequestedFor(urlEqualTo("/charges"))
                .withRequestBody(equalToJson("{\"amount_cents\":4200,\"currency\":\"eur\"}", true, true)));
    }

    @Test
    void reportsAFailedChargeAsPaymentRequired() throws Exception {
        paymentsStub.stubFor(post(urlEqualTo("/charges"))
                .willReturn(aResponse().withStatus(402).withBody("{\"error\":\"card_declined\"}")));

        HttpResponse<String> response = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create(billingBaseUrl + "/invoices/inv-2/pay"))
                        .POST(HttpRequest.BodyPublishers.noBody())
                        .build(),
                HttpResponse.BodyHandlers.ofString());

        assertEquals(402, response.statusCode());
    }
}
