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

  Scenario: An unknown promo is rejected
    When I apply the promo code "NOTREAL"
    Then the promo is rejected
    And the total is $33.50

  Scenario: Four of one item
    Given an empty cart
    And the cart contains 4 of "MUG-014" at $7.00
    Then the cart holds 4 items
    And the total is $28.00

  Scenario: The promo survives a repeated item
    When I apply the promo code "WELCOME10"
    Then the total is $25.20
