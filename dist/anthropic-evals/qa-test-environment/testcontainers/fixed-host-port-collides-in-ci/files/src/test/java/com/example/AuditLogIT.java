package com.example;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;

class AuditLogIT {

    static final String JDBC_URL = "jdbc:postgresql://localhost:5433/app";

    static GenericContainer<?> postgres;

    @BeforeAll
    static void startDatabase() {
        postgres = new GenericContainer<>("postgres:15")
                .withExposedPorts(5432)
                .withEnv("POSTGRES_DB", "app")
                .withEnv("POSTGRES_PASSWORD", "test")
                .waitingFor(Wait.forListeningPort());
        postgres.setPortBindings(List.of("5433:5432"));
        postgres.start();
        Migrations.applyTo(JDBC_URL, TestDatabase.USER, TestDatabase.PASSWORD);
    }

    @AfterAll
    static void stopDatabase() {
        postgres.stop();
    }

    @Test
    void appendsAnEntry() throws Exception {
        try (Connection c = DriverManager.getConnection(JDBC_URL, TestDatabase.USER, TestDatabase.PASSWORD);
                Statement s = c.createStatement()) {
            s.execute("INSERT INTO audit_log (actor, action) VALUES ('ada', 'order.created')");
            ResultSet rs = s.executeQuery("SELECT count(*) FROM audit_log WHERE actor = 'ada'");
            assertTrue(rs.next());
            assertEquals(1, rs.getInt(1));
        }
    }
}
