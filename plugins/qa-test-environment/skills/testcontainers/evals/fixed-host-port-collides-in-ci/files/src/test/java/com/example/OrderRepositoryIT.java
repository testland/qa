package com.example;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;

class OrderRepositoryIT {

    static GenericContainer<?> postgres;

    @BeforeAll
    static void startDatabase() {
        postgres = new GenericContainer<>("postgres:15")
                .withExposedPorts(5432)
                .withEnv("POSTGRES_DB", "app")
                .withEnv("POSTGRES_PASSWORD", "test")
                .waitingFor(Wait.forListeningPort());
        postgres.setPortBindings(List.of("5432:5432"));
        postgres.start();
        Migrations.applyTo(TestDatabase.JDBC_URL, TestDatabase.USER, TestDatabase.PASSWORD);
    }

    @AfterAll
    static void stopDatabase() {
        postgres.stop();
    }

    @Test
    void savesAndReadsBackAnOrder() throws Exception {
        try (Connection c = TestDatabase.connect(); Statement s = c.createStatement()) {
            s.execute("INSERT INTO orders (id, customer, total_cents) VALUES ('o-1', 'ada', 4200)");
            ResultSet rs = s.executeQuery("SELECT total_cents FROM orders WHERE id = 'o-1'");
            assertTrue(rs.next());
            assertEquals(4200, rs.getInt(1));
        }
    }

    @Test
    void rejectsADuplicateOrderId() throws Exception {
        try (Connection c = TestDatabase.connect(); Statement s = c.createStatement()) {
            s.execute("INSERT INTO orders (id, customer, total_cents) VALUES ('o-2', 'ada', 100)");
            assertThrows(SQLException.class,
                    () -> s.execute("INSERT INTO orders (id, customer, total_cents) VALUES ('o-2', 'bob', 100)"));
        }
    }
}
