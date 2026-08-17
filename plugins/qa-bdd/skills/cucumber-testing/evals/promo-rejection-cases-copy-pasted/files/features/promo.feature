Feature: Promo code validation

  Scenario: A valid code is accepted
    Given a cart worth $40.00
    When I enter a welcome code
    Then the promo is accepted

  Scenario: An expired code is refused
    Given a cart worth $40.00
    When I enter an expired code
    Then I see the message "This code has expired"

  Scenario: An unknown code is refused
    Given a cart worth $40.00
    When I enter an unknown code
    Then I see the message "Code not found"

  Scenario: An empty code is refused
    Given a cart worth $40.00
    When I enter nothing
    Then I see the message "Please enter a code"

  Scenario: A code issued for another region is refused
    Given a cart worth $40.00
    When I enter a code from another region
    Then I see the message "This code is not valid in your region"
