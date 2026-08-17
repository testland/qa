Feature: Promo codes at checkout

  Scenario: A valid code reduces the total
    Given a cart worth $40.00
    When I enter "WELCOME10" in the promo field
    Then the total is $36.00

  Scenario: An unknown code is refused
    Given a cart worth $40.00
    When I enter "NOTREAL" in the promo field
    Then the message is "Code not found"
