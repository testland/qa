| column | type | meaning |
|---|---|---|
| customer_id | int64 | sequential account number, new accounts get the next number |
| region_code | int64 | sales region 1-14 (a code, not a quantity) |
| basket_value | float64 | order value in EUR |
| n_items | int64 | items in the basket |
| channel | string | web, app or store |
| fraud_score | float64 | model output, 0-1 |
