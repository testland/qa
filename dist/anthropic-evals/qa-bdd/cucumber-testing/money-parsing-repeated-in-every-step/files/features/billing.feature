Feature: Subscription billing

  Scenario: Upgrading mid-cycle is prorated
    Given a customer on the Team plan
    And 12 days remain in the 30 day cycle
    When they upgrade to the Enterprise plan
    Then they are charged "£60.00" today

  Scenario: Downgrading mid-cycle credits the difference
    Given a customer on the Enterprise plan
    And 15 days remain in the 30 day cycle
    When they downgrade to the Team plan
    Then they are credited "£75.00"

  Scenario: A credit balance covers the charge
    Given a customer on the Team plan
    And a credit balance of "£100.00"
    And 12 days remain in the 30 day cycle
    When they upgrade to the Enterprise plan
    Then their balance is "£40.00"
