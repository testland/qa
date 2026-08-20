Feature: Refund policy

  Scenario: Full refund inside thirty days
    Given a delivered order worth $80.00 in the "books" category
    When a refund is requested 10 days later
    Then the refund is approved for $80.00

  Scenario: Half refund in the second month
    Given a delivered order worth $80.00 in the "books" category
    When a refund is requested 45 days later
    Then the refund is approved for $40.00

  Scenario: Nothing after sixty days
    Given a delivered order worth $80.00 in the "books" category
    When a refund is requested 90 days later
    Then the refund is refused because "Outside the refund window"
