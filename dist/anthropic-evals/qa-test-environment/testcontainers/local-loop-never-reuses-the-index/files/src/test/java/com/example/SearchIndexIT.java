package com.example;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;

class SearchIndexIT {

    static GenericContainer<?> search;
    static SearchClient client;

    @BeforeAll
    static void startSearchEngine() {
        search = new GenericContainer<>("opensearchproject/opensearch:2.17.1")
                .withExposedPorts(9200)
                .withEnv("discovery.type", "single-node")
                .withEnv("DISABLE_SECURITY_PLUGIN", "true")
                .waitingFor(Wait.forHttp("/_cluster/health")
                        .forStatusCode(200)
                        .withStartupTimeout(Duration.ofMinutes(2)))
                .withReuse(true);
        search.start();

        client = new SearchClient("http://" + search.getHost() + ":" + search.getMappedPort(9200));
        client.recreateIndex("catalog");
    }

    @AfterAll
    static void stopSearchEngine() {
        search.stop();
    }

    @Test
    void findsADocumentByTitle() {
        client.index("catalog", "doc-1", "{\"title\":\"blue mug\"}");
        client.refresh("catalog");

        List<String> hits = client.search("catalog", "blue");

        assertEquals(List.of("doc-1"), hits);
    }

    @Test
    void returnsNothingForAnUnknownTerm() {
        client.refresh("catalog");

        assertTrue(client.search("catalog", "zzzzzz").isEmpty());
    }
}
