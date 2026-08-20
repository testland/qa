Feature: Monthly sales report

  Scenario: The report covers every catalogue line
    When the monthly sales report is built
    Then it covers 5000 lines

  Scenario: The report totals revenue across the catalogue
    When the monthly sales report is built
    Then the revenue total is 127500
