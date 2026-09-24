package com.northwind.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;

class ConfigRegistryTest {

    @Test
    void returnsAPopulatedRegistry() {
        ConfigRegistry registry = ConfigRegistry.get();

        assertNotNull(registry);
        assertEquals(3, registry.size());
        assertEquals(30, registry.refreshSeconds());
        assertEquals("https://billing.internal:8443", registry.endpoint("billing"));
    }

    @Test
    void returnsTheSameRegistryEveryTime() {
        assertSame(ConfigRegistry.get(), ConfigRegistry.get());
    }
}
