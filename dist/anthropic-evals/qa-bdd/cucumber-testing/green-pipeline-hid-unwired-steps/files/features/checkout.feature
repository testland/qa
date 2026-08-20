Feature: Checkout payment

  Scenario: Card payment succeeds
    Given a cart worth $30.00
    When I pay by card
    Then the order is confirmed

  Scenario: A declined card creates no order
    Given a cart worth $30.00
    When the card is declined
    Then the order is not created
    And the cart still holds the items

  Scenario: A gift card covers the whole order
    Given a cart worth $30.00
    And a gift card worth $30.00
    When I pay with the gift card
    Then the order is confirmed
    And no card is charged

  Scenario: A gift card covers part of the order
    Given a cart worth $30.00
    And a gift card worth $10.00
    When I pay with the gift card and my card
    Then the card is charged $20.00
