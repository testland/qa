# Candidate eval slice vs pinned reference, run 2026-09-07 09:20Z by DS

Same pinned reference (`ref_2026-08-03_to_2026-08-30`). Current dataset is the
held-out evaluation slice for candidate `pagavia-fraud-scorer-v12`, built by
`features-batch` over 2026-09-01..2026-09-05 traffic.

| Column                       | Method       | Drift score | Threshold | Status  |
|------------------------------|--------------|-------------|-----------|---------|
| device_fingerprint_age_days  | wasserstein  | 0.021       | 0.1       | SUCCESS |
| card_bin_risk_score          | wasserstein  | 0.014       | 0.1       | SUCCESS |
| avg_ticket_30d               | wasserstein  | 0.033       | 0.1       | SUCCESS |
| session_velocity_5m          | wasserstein  | 0.027       | 0.1       | SUCCESS |
| billing_zip_match            | jensenshannon| 0.019       | 0.1       | SUCCESS |
| issuer_decline_rate_7d       | wasserstein  | 0.041       | 0.1       | SUCCESS |
| merchant_id_hash             | jensenshannon| 0.608       | 0.1       | FAIL    |
| amount_brl                   | wasserstein  | 0.018       | 0.1       | SUCCESS |
| basket_size                  | wasserstein  | 0.022       | 0.1       | SUCCESS |
| payroll_window_flag          | jensenshannon| 0.036       | 0.1       | SUCCESS |

Share of drifted columns over all 38: 0.026.
