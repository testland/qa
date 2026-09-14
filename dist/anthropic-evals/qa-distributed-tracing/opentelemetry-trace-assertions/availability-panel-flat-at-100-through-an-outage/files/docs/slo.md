# pricing service SLO

Target: 99.5% availability, rolling 28 days. Owner: @pricing. Board
`pricing-availability`, burn alert `PricingErrorBudget` at 2% over one hour.

How the number is computed, verbatim from the platform runbook:

```
availability = 1 - ( count(spans where service.name == "pricing"
                                and status.code == "ERROR")
                   / count(spans where service.name == "pricing") )
```

Two consequences the platform team keep having to repeat:

- Only `ERROR` counts against the budget. `UNSET` and `OK` are both counted as
  successful spans. A span that ends without a status set is indistinguishable
  from one that succeeded.
- Log lines are not in this computation. Nothing in the availability number or
  the burn alert reads a log.
