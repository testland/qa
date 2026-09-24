# churn-propensity, model card (extract)

Task: binary classification, probability an account churns within 90 days.
Retrained monthly. Serving version 6.5.0.

Trained on 19 columns:

| Column                   | Type        | Column                 | Type        |
|--------------------------|-------------|------------------------|-------------|
| tenure_months            | numeric     | seats_licensed         | numeric     |
| monthly_charges          | numeric     | seats_active_30d       | numeric     |
| total_charges            | numeric     | feature_adoption_score | numeric     |
| contract_type            | categorical | logins_30d             | numeric     |
| payment_method           | categorical | days_since_last_login  | numeric     |
| paperless_billing        | categorical | overage_events_90d     | numeric     |
| support_tickets_90d      | numeric     | invoice_disputes_12m   | numeric     |
| avg_ticket_resolution_h  | numeric     | discount_pct           | numeric     |
| nps_last                 | numeric     | renewal_window_days    | numeric     |
| industry_code            | categorical |                        |             |

Label: `churn_label` (observed at the 90-day horizon, backfilled weekly).
Scored output: `churn_score` (probability, written by the scoring job).

Every other column in the warehouse scoring view is carried for joins, audit and
support lookup. The model does not read them.
