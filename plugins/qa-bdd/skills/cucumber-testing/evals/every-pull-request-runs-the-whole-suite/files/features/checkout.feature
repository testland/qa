Feature: Checkout payment

  Scenario: Card payment succeeds
    Given a cart worth $30.00
    When I pay by card
    Then the order is confirmed

  Scenario: A declined card creates no order
    Given a cart worth $30.00
    When the card is declined
    Then the order is not created

# Not merged yet - uncomment when the split-payment work lands.
#  Scenario: Payment split across two cards
#    Given a cart worth $30.00
#    When I pay $10.00 with one card and $20.00 with another
#    Then the order is confirmed
#
#  Scenario: A declined second card creates no order
#    Given a cart worth $30.00
#    When I pay $10.00 with one card and the second card is declined
#    Then the order is not created
