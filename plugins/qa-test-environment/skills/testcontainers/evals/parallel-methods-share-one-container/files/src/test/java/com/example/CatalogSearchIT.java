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
