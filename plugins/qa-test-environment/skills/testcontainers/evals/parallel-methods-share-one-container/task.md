# Turning on parallel test methods made the integration suite fail at random

## Problem Description

The integration suite took twelve minutes, so we switched the failsafe plugin to
run test methods in parallel across four threads and enabled the same thing in
`junit-platform.properties`. The suite now finishes in about four minutes and
fails roughly one run in five.

The failures move around. Most often it is
`ERROR: duplicate key value violates unique constraint "catalog_item_pkey"`.
Sometimes a count assertion expects three rows and sees seven. Once, on a
completely cold run, a test failed with
`ERROR: relation "catalog_item" does not exist`, which should be impossible
because the schema is created before any test runs.

Every one of those tests passes when run on its own, and the whole class passes
if we drop the thread count back to one.

## Output Specification

1. Make the suite deterministic again, keeping whatever speed-up is safe to keep.
2. The arrangement must be explicit in the delivered files: which database a given
   test sees, and what may run at the same time as what. Configuration and test
   code must agree - do not leave a parallelism setting in `pom.xml` that the test
   code contradicts.
3. Every test must observe only the rows it is responsible for, and the schema
   must be in place before any test touches it.
4. Keep all four test methods and their assertions. Do not disable, skip, or
   merge a test to make the run green.

## Input Files

Extract the following files before beginning.

=============== FILE: src/test/java/com/example/CatalogSearchIT.java ===============
package com.example;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
class CatalogSearchIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    static Connection connect() throws Exception {
        return java.sql.DriverManager.getConnection(
                postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
    }

    @BeforeAll
    static void createSchema() throws Exception {
        try (Connection c = connect(); Statement s = c.createStatement()) {
            s.execute("CREATE TABLE catalog_item (sku text PRIMARY KEY, name text, in_stock boolean)");
        }
    }

    @Test
    void findsAnItemBySku() throws Exception {
        try (Connection c = connect(); Statement s = c.createStatement()) {
            s.execute("INSERT INTO catalog_item VALUES ('SKU-1', 'blue mug', true)");
            ResultSet rs = s.executeQuery("SELECT name FROM catalog_item WHERE sku = 'SKU-1'");
            assertTrue(rs.next());
            assertEquals("blue mug", rs.getString(1));
        }
    }

    @Test
    void listsOnlyItemsInStock() throws Exception {
        try (Connection c = connect(); Statement s = c.createStatement()) {
            s.execute("INSERT INTO catalog_item VALUES ('SKU-2', 'red mug', true)");
            s.execute("INSERT INTO catalog_item VALUES ('SKU-3', 'green mug', false)");
            ResultSet rs = s.executeQuery("SELECT count(*) FROM catalog_item WHERE in_stock");
            assertTrue(rs.next());
            assertEquals(2, rs.getInt(1));
        }
    }

    @Test
    void countsEverythingInTheCatalog() throws Exception {
        try (Connection c = connect(); Statement s = c.createStatement()) {
            s.execute("INSERT INTO catalog_item VALUES ('SKU-4', 'mug set', true)");
            ResultSet rs = s.executeQuery("SELECT count(*) FROM catalog_item");
            assertTrue(rs.next());
            assertEquals(3, rs.getInt(1));
        }
    }

    @Test
    void matchesOnAPartialName() throws Exception {
        try (Connection c = connect(); Statement s = c.createStatement()) {
            s.execute("INSERT INTO catalog_item VALUES ('SKU-5', 'wool scarf', true)");
            ResultSet rs = s.executeQuery("SELECT count(*) FROM catalog_item WHERE name LIKE '%scarf%'");
            assertTrue(rs.next());
            assertEquals(1, rs.getInt(1));
        }
    }
}

=============== FILE: src/test/resources/junit-platform.properties ===============
junit.jupiter.execution.parallel.enabled=true
junit.jupiter.execution.parallel.mode.default=concurrent
junit.jupiter.execution.parallel.config.strategy=fixed
junit.jupiter.execution.parallel.config.fixed.parallelism=4

=============== FILE: pom.xml ===============
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>catalog</artifactId>
  <version>2.3.0</version>
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
      <artifactId>postgresql</artifactId>
      <version>1.20.4</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.testcontainers</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>1.20.4</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <artifactId>maven-failsafe-plugin</artifactId>
        <version>3.5.2</version>
        <configuration>
          <parallel>methods</parallel>
          <threadCount>4</threadCount>
        </configuration>
        <executions>
          <execution>
            <goals><goal>integration-test</goal><goal>verify</goal></goals>
          </execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>
