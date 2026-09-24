# pagavia-fraud-scorer, feature inventory (extract)

38 columns. The online value is what the scorer reads at authorisation time; the
offline value is what the warehouse holds and what training and evaluation
datasets are built from. Listed alphabetically.

| Column                      | Online writer                  | Offline writer                                                     |
|-----------------------------|--------------------------------|--------------------------------------------------------------------|
| amount_brl                  | request payload                | request payload, copied                                             |
| avg_ticket_30d              | risk-features (Java)           | features-batch (Spark)                                              |
| basket_size                 | request payload                | request payload, copied                                             |
| billing_zip_match           | risk-features (Java)           | features-batch (Spark)                                              |
| card_bin_risk_score         | risk-features (Java)           | features-batch (Spark)                                              |
| cardholder_segment          | warehouse lookup, daily        | warehouse, same table                                               |
| currency                    | request payload                | request payload, copied                                             |
| device_fingerprint_age_days | risk-features (Java)           | features-batch (Spark)                                              |
| device_os                   | request payload                | request payload, copied                                             |
| entry_mode                  | request payload                | request payload, copied                                             |
| hour_of_day                 | derived from request timestamp | derived from request timestamp                                      |
| installments                | request payload                | request payload, copied                                             |
| is_ecommerce                | request payload                | request payload, copied                                             |
| issuer_country              | request payload                | request payload, copied                                             |
| issuer_decline_rate_7d      | risk-features (Java)           | features-batch (Spark)                                              |
| mcc_category                | request payload                | request payload, copied                                             |
| merchant_id_hash            | feature-pipeline               | features-batch, recomputed from the raw merchant id on every build  |
| payroll_window_flag         | warehouse lookup, daily        | warehouse, same table                                               |
| session_velocity_5m         | risk-features (Java)           | features-batch (Spark)                                              |

The remaining 19 columns are request-payload fields copied unchanged into the
warehouse.
