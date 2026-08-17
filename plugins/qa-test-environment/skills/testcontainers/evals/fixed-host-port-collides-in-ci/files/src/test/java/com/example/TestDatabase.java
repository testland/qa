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
