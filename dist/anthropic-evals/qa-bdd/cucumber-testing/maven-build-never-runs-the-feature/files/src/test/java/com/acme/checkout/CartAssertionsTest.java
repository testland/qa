package com.acme.checkout;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CartAssertionsTest {

    @Test
    void twoOfTheSameItem() {
        Cart cart = new Cart();
        cart.add("BOOK-001", 2, 12.50);
        assertEquals(2, cart.itemCount());
        assertEquals(25.00, cart.total(), 0.001);
    }

    @Test
    void promoAppliesToTheWholeCart() {
        Cart cart = new Cart();
        cart.add("BOOK-001", 1, 12.50);
        cart.add("MUG-014", 3, 7.00);
        cart.applyPromo("WELCOME10");
        assertEquals(30.15, cart.total(), 0.001);
    }
}
