# pricing service SLO

Target: 99.5% availability, rolling 28 days. Owner: @pricing. Board
`pricing-availability`, burn alert `PricingErrorBudget` at 2% over one hour.

How the number is computed, verbatim from the platform runbook:

```
availability = 1 - ( count(spans where service.name == "pricing"
                                and status.code == "ERROR")
                   / count(spans where service.name == "pricing") )
```

The same query backs `search-availability`, `shipping-availability`,
`accounts-availability` and `notify-availability`. Platform will not fork it per
service and have said so twice on OBS-1204.
