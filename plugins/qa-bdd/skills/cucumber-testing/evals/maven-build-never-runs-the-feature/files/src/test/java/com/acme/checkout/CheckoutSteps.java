package com.acme.checkout;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class CheckoutSteps {

    private Cart cart;

    @Given("an empty cart")
    public void an_empty_cart() {
        cart = new Cart();
    }

    @Given("the cart contains {int} of {string} at ${double}")
    public void the_cart_contains(int qty, String sku, double price) {
        cart.add(sku, qty, price);
    }

    @When("I apply the promo code {string}")
    public void i_apply_the_promo_code(String code) {
        cart.applyPromo(code);
    }

    @Then("the cart holds {int} items")
    public void the_cart_holds(int expected) {
        assertEquals(expected, cart.itemCount());
    }

    @Then("the total is ${double}")
    public void the_total_is(double expected) {
        assertEquals(expected, cart.total(), 0.001);
    }
}
