# Integration tests fight over port 5432 on the build machine

## Problem Description

Our integration tests start their own Postgres before the test methods run. Both
IT classes then talk to it through the constants in `TestDatabase`, so the
database has to land on the exact host port those constants name.

That held together until the pipeline started building three Maven modules
concurrently on the same self-hosted runner. Now roughly half the runs die with
`Bind for 0.0.0.0:5432 failed: port is already allocated`, and it is never the
same job twice. Developers who already run Postgres on their laptop cannot run
the suite at all.

We tried giving each class its own number - `OrderRepositoryIT` on 5432,
`AuditLogIT` on 5433. That bought us about two weeks, until a third IT class was
added and until the CI matrix went from two concurrent jobs to four.

## Output Specification

1. Rework `OrderRepositoryIT` and `AuditLogIT` so that any number of them can be
   running at the same moment on one machine without anyone coordinating port
   numbers.
2. `TestDatabase` must hand out connection settings that describe the database
   the calling class actually started. A test class must not know a port number
   before its database exists.
3. No file may contain a literal database host or host port - not in a Java
   constant, not in a config file, not in `pom.xml`.
4. Keep every existing test method and every assertion, and keep the property
   that `Migrations.applyTo(...)` runs once per class before its tests.

## Input Files

Extract the following files before beginning.

=============== FILE: src/test/java/com/example/TestDatabase.java ===============
package com.example;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public final class TestDatabase {

    public static final String JDBC_URL = "jdbc:postgresql://localhost:5432/app";
    public static final String USER = "postgres";
    public static final String PASSWORD = "test";

    private TestDatabase() {
    }

    public static Connection connect() throws SQLException {
        return DriverManager.getConnection(JDBC_URL, USER, PASSWORD);
    }
}

=============== FILE: src/test/java/com/example/OrderRepositoryIT.java ===============
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

=============== FILE: src/test/java/com/example/AuditLogIT.java ===============
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

=============== FILE: pom.xml ===============
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>orders</artifactId>
  <version>1.0.0</version>
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
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
      <version>42.7.4</version>
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
