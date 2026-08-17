Feature: Supplier price import

  Scenario: A single valid row is imported
    Given a supplier file listing "BOOK-001" with quantity 4 at $12.50
    When the file is imported
    Then the import accepts 1 row
    And nothing is rejected
