# Worked example - PERT arithmetic

Deep reference for the `test-effort-estimation` SKILL.md. The row-by-row PERT arithmetic behind the "Promo codes at checkout" epic, using the formulas from the spine (`E = (a + 4m + b) / 6`, `SD = (b - a) / 6`). The filled output document is in [effort-estimate-output-template.md](effort-estimate-output-template.md).

Epic: **Promo codes at checkout** (stories 12 to 15). Change-shape distribution
supplied by the classifier: 30 percent `service-layer`, 25 percent `ui-heavy`,
25 percent `pure-logic`, 20 percent `data-heavy`. Three-point values gathered in
a two-round Wideband Delphi with three estimators.

Row arithmetic:

```
Checkout flow (service):    E = (4 + 32 + 16)/6 = 8.7    SD = (16 - 4)/6 = 2.0
Checkout flow (UI/E2E):     E = (2 + 20 + 10)/6 = 5.3    SD = (10 - 2)/6 = 1.3
Discount-code API (service):E = (2 + 16 +  8)/6 = 4.3    SD = ( 8 - 2)/6 = 1.0
Discount rules (unit):      E = (3 + 20 +  9)/6 = 5.3    SD = ( 9 - 3)/6 = 1.0
Promo schema (data checks): E = (2 + 24 + 14)/6 = 6.7    SD = (14 - 2)/6 = 2.0
Checkout (exploratory):     E = (2 + 12 +  6)/6 = 3.3    SD = ( 6 - 2)/6 = 0.7
```

Aggregation:

```
E_total  = 8.7 + 5.3 + 4.3 + 5.3 + 6.7 + 3.3 = 33.6 h
SD_total = sqrt(2.0^2 + 1.3^2 + 1.0^2 + 1.0^2 + 2.0^2 + 0.7^2)
         = sqrt(4.00 + 1.69 + 1.00 + 1.00 + 4.00 + 0.49)
         = sqrt(12.18) = 3.5 h
Independent-rows range:   30.1 to 37.1 h
Fully-correlated bound:   sum(SD) = 8.0  ->  25.6 to 41.6 h
```

The two ranges are reported together because assumption A2 (staging
availability) is shared by four of the six rows, so the independence assumption
behind `SD_total` is known to be imperfect
([Brunel University, Network analysis: uncertain completion times](https://people.brunel.ac.uk/~mastjjb/jeb/or/netpert.html)).
