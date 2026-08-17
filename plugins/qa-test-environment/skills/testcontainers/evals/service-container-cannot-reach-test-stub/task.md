# The billing container cannot call the stub server running inside the test JVM

## Problem Description

`PaymentGatewayIT` runs a stub HTTP server inside the test JVM to stand in for
the payment provider, then starts our billing service image and points it at that
stub. The billing container logs

```
Connection refused: localhost/127.0.0.1:8089
```

and the test fails on the first charge. The stub is definitely up - the test
process itself can hit `http://localhost:8089/__admin` while the container is
sitting there failing.

While debugging, the stub was pinned to port 8089 (it used to take whatever port
was free) and a three-second pause was added after starting it in case it was a
startup race. Neither helped, and the pinned port now clashes with two other
integration classes when the build runs them together, so it has to go back to a
free port.

The stub has to stay in the test JVM: the test configures its responses per test
case and then asserts on the requests it received.

## Output Specification

1. Make the billing container able to reach the stub running in the test JVM.
2. The stub must go back to taking a free port chosen at run time - several
   integration classes run at once and cannot agree a number in advance.
3. Remove the three-second pause. The test must wait for something observable
   instead, or not wait at all if nothing needs waiting for.
4. The stubbing calls and the request verification stay in the test process, and
   the assertions do not change.

## Input Files

Extract the following files before beginning.

=============== FILE: src/test/java/com/example/PaymentGatewayIT.java ===============
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

=============== FILE: pom.xml ===============
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>billing</artifactId>
  <version>4.1.0</version>
  <properties>
    <maven.compiler.release>21</maven.compiler.release>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.11.3</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.testcontainers</groupId>
      <artifactId>testcontainers</artifactId>
      <version>1.20.4</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.wiremock</groupId>
      <artifactId>wiremock</artifactId>
      <version>3.9.2</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <artifactId>maven-failsafe-plugin</artifactId>
        <version>3.5.2</version>
        <executions>
          <execution>
            <goals><goal>integration-test</goal><goal>verify</goal></goals>
          </execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>
