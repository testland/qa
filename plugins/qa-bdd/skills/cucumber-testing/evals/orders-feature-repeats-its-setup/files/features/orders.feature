Feature: Order management

  Scenario: A placed order appears in the customer's history
    Given the test database is empty
    And the API client is authenticated with the seed token
    And the catalogue lists "BOOK-001" at $12.50
    And a customer "Dana" with a confirmed email
    When Dana orders 2 of "BOOK-001"
    Then Dana's history shows 1 order worth $25.00

  Scenario: A pending order can be cancelled
    Given the test database is empty
    And the API client is authenticated with the seed token
    And the catalogue lists "BOOK-001" at $12.50
    And a customer "Dana" with a confirmed email
    And Dana has a pending order
    When the order is cancelled
    Then the order status is "cancelled"

  Scenario: A cancelled order cannot be cancelled again
    Given the test database is empty
    And the API client is authenticated with the seed token
    And the catalogue lists "BOOK-001" at $12.50
    And a customer "Dana" with a confirmed email
    And Dana has a cancelled order
    When the order is cancelled
    Then the cancellation is refused because "Order is not pending"

  Scenario: An unconfirmed customer cannot order
    Given the test database is empty
    And the API client is authenticated with the seed token
    And the catalogue lists "BOOK-001" at $12.50
    And a customer "Milo" with an unconfirmed email
    When Milo orders 1 of "BOOK-001"
    Then the order is refused because "Email not confirmed"
