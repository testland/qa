# mvn test says BUILD SUCCESS and never touches checkout.feature

## Problem Description

`CheckoutSteps.java` and `checkout.feature` were added a month ago by a
contractor. Everything compiles, `mvn test` is green, and until yesterday we
believed the three scenarios were running.

They are not. The tail of a full `mvn test` is in `mvn-test-tail.txt`: the only
class Surefire reports is `CartAssertionsTest`, two tests, and no scenario name
appears anywhere in the output. Breaking `Cart.total()` on purpose still gives
BUILD SUCCESS as long as you break it in a way `CartAssertionsTest` does not
happen to cover.

`CartAssertionsTest` is itself part of the story - the contractor wrote it
because "the feature wasn't running", and it re-asserts by hand the same two
behaviours that the first two scenarios describe. It is why nobody noticed.

The project is on JUnit 5 (`junit-jupiter`) and we are not adding JUnit 4 to it.

## Output Specification

1. `mvn test` must discover and execute all three scenarios in
   `checkout.feature`, and the build must fail when one of them fails.
2. The scenario text and the step sentences in `CheckoutSteps.java` stay exactly
   as they are.
3. Decide what happens to `CartAssertionsTest` and act on it. Note that once
   point 1 holds, the first two scenarios cover what it covers.
4. Nothing under `src/main/java` changes.
5. Deliver the files, including the full contents of any file you add and the
   final `pom.xml`.

## Input Files

Extract the following files before beginning.

=============== FILE: pom.xml ===============
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.acme</groupId>
  <artifactId>checkout</artifactId>
  <version>1.0.0</version>

  <properties>
    <maven.compiler.release>17</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <cucumber.version>7.20.0</cucumber.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>io.cucumber</groupId>
      <artifactId>cucumber-java</artifactId>
      <version>${cucumber.version}</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.11.3</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.5.2</version>
      </plugin>
    </plugins>
  </build>
</project>

=============== FILE: src/test/java/com/acme/checkout/checkout.feature ===============
Feature: Shopping cart totals

  Scenario: Two of the same item
    Given an empty cart
    And the cart contains 2 of "BOOK-001" at $12.50
    Then the cart holds 2 items
    And the total is $25.00

  Scenario: A promo applies to the whole cart
    Given an empty cart
    And the cart contains 1 of "BOOK-001" at $12.50
    And the cart contains 3 of "MUG-014" at $7.00
    When I apply the promo code "WELCOME10"
    Then the total is $30.15

  Scenario: An unknown promo leaves the total alone
    Given an empty cart
    And the cart contains 4 of "MUG-014" at $7.00
    When I apply the promo code "NOTREAL"
    Then the total is $28.00

=============== FILE: src/test/java/com/acme/checkout/CheckoutSteps.java ===============
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

=============== FILE: src/test/java/com/acme/checkout/CartAssertionsTest.java ===============
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

=============== FILE: src/main/java/com/acme/checkout/Cart.java ===============
package com.acme.checkout;

import java.util.ArrayList;
import java.util.List;

public class Cart {

    private record Line(String sku, int qty, double price) {}

    private final List<Line> lines = new ArrayList<>();
    private double discount;

    public void add(String sku, int qty, double price) {
        lines.add(new Line(sku, qty, price));
    }

    public int itemCount() {
        return lines.stream().mapToInt(Line::qty).sum();
    }

    public double subtotal() {
        return lines.stream().mapToDouble(l -> l.qty() * l.price()).sum();
    }

    public boolean applyPromo(String code) {
        discount = "WELCOME10".equals(code) ? 0.10 : 0.0;
        return discount > 0;
    }

    public double total() {
        return Math.round(subtotal() * (1 - discount) * 100) / 100.0;
    }
}

=============== FILE: mvn-test-tail.txt ===============
[INFO] --- maven-surefire-plugin:3.5.2:test (default-test) @ checkout ---
[INFO] Using auto detected provider org.apache.maven.surefire.junitplatform.JUnitPlatformProvider
[INFO]
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.acme.checkout.CartAssertionsTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.041 s
[INFO]
[INFO] Results:
[INFO]
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] BUILD SUCCESS
