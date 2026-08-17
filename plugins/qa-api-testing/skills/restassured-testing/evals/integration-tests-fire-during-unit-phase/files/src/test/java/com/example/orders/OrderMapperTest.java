package com.example.orders;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OrderMapperTest {

  @Test
  @DisplayName("cents are rendered with two decimals")
  void formatsAmount() {
    assertEquals("51.00", OrderMapper.formatCents(5100));
  }

  @Test
  @DisplayName("an unknown carrier code maps to UNKNOWN")
  void mapsUnknownCarrier() {
    assertEquals("UNKNOWN", OrderMapper.carrierName("ZZ"));
  }
}
