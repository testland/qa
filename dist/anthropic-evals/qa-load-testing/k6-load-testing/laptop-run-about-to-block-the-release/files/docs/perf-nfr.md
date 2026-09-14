# Release budgets - signed 2026-06-04

Owners: Priya (API), Tomás (storefront), release management.

| Measure                                        | Budget           |
|------------------------------------------------|------------------|
| `/api/checkout`, 95th percentile response time  | under 800 ms     |
| `/api/checkout`, HTTP error rate                | under 2%         |
| `/api/checkout`, orders reaching `confirmed`    | at least 99.5%   |

A release does not ship while a signed budget is breached. Changing a budget
needs all three owners; it is not a release-day decision.
