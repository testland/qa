Feature: Invoice details

  Scenario: A purchase order number is stored on the invoice
    Given an invoice for $40.00
    When I enter "PO-4471" in the reference field
    Then the invoice reference is "PO-4471"

  Scenario: A blank reference is refused
    Given an invoice for $40.00
    When I enter "" in the reference field
    Then the message is "Reference is required"
