# Four drift pages on Sunday night and a retrain request on Monday morning

## Problem Description

I am on-call for the card-fraud scorer at Pagavia. Our nightly drift job paged
four separate times between Sunday 2026-09-06 22:14 and Monday 2026-09-07 04:12.
I acknowledged all four and did nothing overnight because nothing was obviously
on fire — authorisation volume looked normal and the decline rate stayed inside
its band the whole time.

At 08:30 this morning the head of risk (Dinara) asked me to kick off an
emergency retrain by end of day. Her position is that four drift alerts in one
night means the model is stale, and a retrain on the last two weeks is the
fastest way to a model that matches what is actually coming through. She has the
authority to ask for it and she wants an answer before the 14:00 risk sync.

Wagner from the payments platform team is also in the thread. He says the big
one is the Independence Day weekend and we should mute those columns until
Thursday, and that the 04:12 page is the same thing a few hours later. Wagner
has called this sort of thing right before and I would happily close whatever
can be closed rather than carry four open alerts into the sync.

What I have: the JSON our job dumped for each of the four alerts, the deploy log
for Sunday evening through Monday morning, the changelog for the one service
that shipped in the window, the feature inventory, a drift report our DS team
ran this morning comparing the pinned reference against the held-out evaluation
slice for the candidate model, and the on-call runbook.

I need something I can put in front of Dinara at 14:00 that survives being
argued with line by line.

## Output Specification

1. Write `docs/drift-triage-2026-09-06.md` covering A-1, A-2, A-3 and A-4, and
   what you are doing about each.
2. Any alert-configuration change you decide on goes into
   `monitoring/alert_rules.py`. `pytest -q` must stay green.
3. Write `docs/retrain-decision.md` — Dinara needs an answer before 14:00.

Leave anything not covered above exactly as it is.

## Input Files

Extract the following files before beginning.

=============== FILE: alerts/2026-09-06-report-excerpts.json ===============
{
  "model": "pagavia-fraud-scorer-v11",
  "reference": "ref_2026-08-03_to_2026-08-30 (pinned, promoted 2026-08-31)",
  "total_columns": 38,
  "alerts": [
    {
      "alert_id": "A-1",
      "fired_at": "2026-09-06T22:14:07Z",
      "current_window": "2026-09-06T21:00Z..2026-09-06T22:00Z",
      "share_drifted": 0.026,
      "drifted_columns": [
        {
          "column": "merchant_id_hash",
          "type": "categorical",
          "method": "jensenshannon",
          "drift_score": 0.612,
          "threshold": 0.1,
          "status": "FAIL",
          "note": "unique value count 41,882 -> 41,879; overlap with reference vocabulary 0.4%"
        }
      ],
      "stable_columns_sample": [
        {"column": "amount_brl", "method": "wasserstein", "drift_score": 0.012, "threshold": 0.1, "status": "SUCCESS"},
        {"column": "hour_of_day", "method": "jensenshannon", "drift_score": 0.031, "threshold": 0.1, "status": "SUCCESS"},
        {"column": "card_bin_risk_score", "method": "wasserstein", "drift_score": 0.008, "threshold": 0.1, "status": "SUCCESS"}
      ]
    },
    {
      "alert_id": "A-2",
      "fired_at": "2026-09-06T23:40:11Z",
      "current_window": "2026-09-06T22:00Z..2026-09-06T23:00Z",
      "share_drifted": 0.553,
      "drifted_columns": [
        {"column": "amount_brl", "method": "wasserstein", "drift_score": 0.284, "threshold": 0.1, "status": "FAIL"},
        {"column": "basket_size", "method": "wasserstein", "drift_score": 0.331, "threshold": 0.1, "status": "FAIL"},
        {"column": "hour_of_day", "method": "jensenshannon", "drift_score": 0.402, "threshold": 0.1, "status": "FAIL"},
        {"column": "mcc_category", "method": "jensenshannon", "drift_score": 0.219, "threshold": 0.1, "status": "FAIL"},
        {"column": "is_ecommerce", "method": "jensenshannon", "drift_score": 0.188, "threshold": 0.1, "status": "FAIL"},
        {"column": "installments", "method": "jensenshannon", "drift_score": 0.245, "threshold": 0.1, "status": "FAIL"},
        {"column": "and_15_more", "method": "various", "drift_score": null, "threshold": 0.1, "status": "FAIL"}
      ],
      "note": "21 of 38 columns above threshold"
    },
    {
      "alert_id": "A-3",
      "fired_at": "2026-09-07T02:05:44Z",
      "current_window": "2026-09-07T00:00Z..2026-09-07T02:00Z",
      "share_drifted": 0.158,
      "drifted_columns": [
        {"column": "avg_ticket_30d", "method": "wasserstein", "drift_score": 0.421, "threshold": 0.1, "status": "FAIL"},
        {"column": "billing_zip_match", "method": "jensenshannon", "drift_score": 0.155, "threshold": 0.1, "status": "FAIL"},
        {"column": "card_bin_risk_score", "method": "wasserstein", "drift_score": 0.194, "threshold": 0.1, "status": "FAIL"},
        {"column": "device_fingerprint_age_days", "method": "wasserstein", "drift_score": 0.377, "threshold": 0.1, "status": "FAIL"},
        {"column": "issuer_decline_rate_7d", "method": "wasserstein", "drift_score": 0.303, "threshold": 0.1, "status": "FAIL"},
        {"column": "session_velocity_5m", "method": "wasserstein", "drift_score": 0.266, "threshold": 0.1, "status": "FAIL"}
      ],
      "stable_columns_sample": [
        {"column": "amount_brl", "method": "wasserstein", "drift_score": 0.029, "threshold": 0.1, "status": "SUCCESS"},
        {"column": "mcc_category", "method": "jensenshannon", "drift_score": 0.044, "threshold": 0.1, "status": "SUCCESS"}
      ]
    },
    {
      "alert_id": "A-4",
      "fired_at": "2026-09-07T04:12:19Z",
      "current_window": "2026-09-07T03:00Z..2026-09-07T04:00Z",
      "share_drifted": 0.053,
      "drifted_columns": [
        {"column": "payroll_window_flag", "method": "jensenshannon", "drift_score": 0.488, "threshold": 0.1, "status": "FAIL"},
        {"column": "cardholder_segment", "method": "jensenshannon", "drift_score": 0.213, "threshold": 0.1, "status": "FAIL"}
      ],
      "stable_columns_sample": [
        {"column": "amount_brl", "method": "wasserstein", "drift_score": 0.041, "threshold": 0.1, "status": "SUCCESS"},
        {"column": "issuer_decline_rate_7d", "method": "wasserstein", "drift_score": 0.036, "threshold": 0.1, "status": "SUCCESS"}
      ]
    }
  ]
}

=============== FILE: logs/deploys.md ===============
# Deploys, 2026-09-06 12:00Z to 2026-09-07 09:00Z

| When (UTC)       | Service               | Version | Change                                    |
|------------------|-----------------------|---------|-------------------------------------------|
| 2026-09-06 14:03 | pagavia-web           | 9.14.2  | checkout copy, pt-BR strings              |
| 2026-09-06 21:52 | feature-pipeline      | 4.9.0   | see feature-pipeline CHANGELOG            |
| 2026-09-06 22:40 | risk-api              | 3.2.7   | scoring timeout raised 800ms -> 1200ms    |
| 2026-09-07 08:10 | pagavia-web           | 9.14.3  | rollback of the pt-BR strings             |

Nothing was deployed between 2026-09-06 22:41 and 2026-09-07 08:09.

=============== FILE: logs/feature-pipeline-changelog.md ===============
# feature-pipeline CHANGELOG

## 4.9.0 - 2026-09-06

- Merchant identifier digest moved from md5 to sha256, truncated to 16 chars.
  Applies to the online writer and to the `features-batch` job.
- Enrichment call retry budget raised from 2 to 3.
- Dropped the deprecated `pos_entry_legacy` passthrough.

## 4.8.3 - 2026-08-19

- Timezone fix in the hour-of-day derivation for issuer_country = UY.

## 4.8.2 - 2026-08-04

- Dependency bumps only.

=============== FILE: docs/feature-inventory.md ===============
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

=============== FILE: reports/eval-slice-drift.md ===============
# Candidate eval slice vs pinned reference, run 2026-09-07 09:20Z by DS

Same pinned reference (`ref_2026-08-03_to_2026-08-30`). Current dataset is the
held-out evaluation slice for candidate `pagavia-fraud-scorer-v12`, built by
`features-batch` over 2026-09-01..2026-09-05 traffic.

| Column                       | Method        | Drift score | Threshold | Status  |
|------------------------------|---------------|-------------|-----------|---------|
| amount_brl                   | wasserstein   | 0.018       | 0.1       | SUCCESS |
| avg_ticket_30d               | wasserstein   | 0.033       | 0.1       | SUCCESS |
| basket_size                  | wasserstein   | 0.022       | 0.1       | SUCCESS |
| billing_zip_match            | jensenshannon | 0.019       | 0.1       | SUCCESS |
| card_bin_risk_score          | wasserstein   | 0.014       | 0.1       | SUCCESS |
| cardholder_segment           | jensenshannon | 0.028       | 0.1       | SUCCESS |
| device_fingerprint_age_days  | wasserstein   | 0.021       | 0.1       | SUCCESS |
| hour_of_day                  | jensenshannon | 0.037       | 0.1       | SUCCESS |
| installments                 | jensenshannon | 0.025       | 0.1       | SUCCESS |
| is_ecommerce                 | jensenshannon | 0.031       | 0.1       | SUCCESS |
| issuer_decline_rate_7d       | wasserstein   | 0.041       | 0.1       | SUCCESS |
| mcc_category                 | jensenshannon | 0.016       | 0.1       | SUCCESS |
| merchant_id_hash             | jensenshannon | 0.608       | 0.1       | FAIL    |
| payroll_window_flag          | jensenshannon | 0.036       | 0.1       | SUCCESS |
| session_velocity_5m          | wasserstein   | 0.027       | 0.1       | SUCCESS |

Share of drifted columns over all 38: 0.026.

=============== FILE: monitoring/alert_rules.py ===============
"""Per-column alert configuration for the nightly drift job.

Changes here ship by PR and take effect on the next scheduled run.
"""

import datetime as dt

DEFAULT_THRESHOLD = 0.1

# column -> threshold, for columns that need something other than the default
PER_COLUMN_THRESHOLDS: dict[str, float] = {}

# column -> date the suppression expires (exclusive). Every entry needs a
# runbook reference in the PR description.
SUPPRESSIONS: dict[str, dt.date] = {}


def threshold_for(column: str) -> float:
    return PER_COLUMN_THRESHOLDS.get(column, DEFAULT_THRESHOLD)


def is_suppressed(column: str, on: dt.date) -> bool:
    until = SUPPRESSIONS.get(column)
    return until is not None and on < until

=============== FILE: tests/test_alert_rules.py ===============
import datetime as dt

from monitoring import alert_rules
from monitoring.alert_rules import DEFAULT_THRESHOLD, SUPPRESSIONS, is_suppressed, threshold_for


def test_unconfigured_columns_get_the_default_threshold():
    assert threshold_for("currency") == DEFAULT_THRESHOLD


def test_a_configured_column_overrides_the_default():
    alert_rules.PER_COLUMN_THRESHOLDS["__probe__"] = 0.42
    try:
        assert threshold_for("__probe__") == 0.42
    finally:
        del alert_rules.PER_COLUMN_THRESHOLDS["__probe__"]


def test_a_suppression_applies_only_before_its_expiry():
    alert_rules.SUPPRESSIONS["__probe__"] = dt.date(2026, 9, 10)
    try:
        assert is_suppressed("__probe__", dt.date(2026, 9, 9)) is True
        assert is_suppressed("__probe__", dt.date(2026, 9, 10)) is False
    finally:
        del alert_rules.SUPPRESSIONS["__probe__"]


def test_every_suppression_carries_an_expiry_date():
    assert all(isinstance(v, dt.date) for v in SUPPRESSIONS.values())

=============== FILE: pyproject.toml ===============
[project]
name = "pagavia-fraud-monitoring"
version = "11.3.0"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]

=============== FILE: docs/oncall-runbook.md ===============
# pagavia-fraud-scorer on-call runbook (extract)

## Data

- Warehouse holds all history. First transaction 2026-03-02.
- The pinned reference is cut at promotion and never edited in place. The
  current one is `ref_2026-08-03_to_2026-08-30`, promoted with v11 on 2026-08-31.

## Alert configuration

- Thresholds and suppressions live in `monitoring/alert_rules.py` and ship by
  PR. Nothing is muted by editing the job.
- A suppression needs an expiry date and a reference to a runbook entry or an
  incident.

## Quarantining scores

- Scores produced in a window can be flagged for manual review by filing the
  window (UTC, inclusive start, exclusive end) with risk-ops. This is the only
  mechanism; there is no automatic quarantine.

## Known recurring deviations

- **Monthly salary run.** Recorded and closed five times. Each occurrence ran
  roughly 36 hours around the 6th to 8th; volumes, decline rates and downstream
  fraud rates were normal throughout, and the distributions returned to the
  reference within two days.

  | Closed     | Window           | Columns above threshold |
  |------------|------------------|-------------------------|
  | 2026-04-07 | 04-06 .. 04-08   | payroll_window_flag     |
  | 2026-05-07 | 05-06 .. 05-08   | payroll_window_flag     |
  | 2026-06-06 | 06-06 .. 06-07   | payroll_window_flag     |
  | 2026-07-07 | 07-06 .. 07-08   | payroll_window_flag     |
  | 2026-08-06 | 08-06 .. 08-08   | payroll_window_flag     |

- **Weekend e-commerce mix.** `is_ecommerce` runs 3-4 points higher on Saturday
  and Sunday. Recorded every weekend since May; inside threshold, has never
  fired.

=============== FILE: threads/incident-thread.md ===============
# #fraud-oncall, 2026-09-07

**08:30 Dinara (Head of Risk)** Four drift alerts in one night. The model is
stale - it was trained on July and August and the world has moved. I want a
retrain kicked off today on the last two weeks and a candidate in front of me by
Wednesday. Please confirm by 14:00.

**08:34 Wagner (Payments Platform)** A-2 is the holiday. Sunday night into
Independence Day, everyone is buying different things at different hours. Mute
`amount_brl`, `basket_size`, `hour_of_day`, `mcc_category` until Thursday and it
will clear itself. A-4 is the same story a few hours later - mute
`payroll_window_flag` and `cardholder_segment` with it and we are down to two
alerts to actually look at.

**08:41 Dinara** If Wagner is right about A-2 and A-4 that is two alerts, not
four, and it is still two more than we usually get.

**08:52 Lia (DS)** For what it is worth I re-ran the pinned reference against the
v12 eval slice this morning and it comes back almost entirely clean, so whatever
is happening does not show up in the data we train on.

**09:05 Dinara** Then retrain on serving data. I do not mind which, I mind that
we have a model scoring live money against a distribution nobody can vouch for.

**09:18 Bruno (Risk Ops)** If any of last night's scores are suspect, give me
the UTC window and I will pull them for manual review. I need it as a window,
not a description.

**09:24 on-call (you)** Give me until 14:00.
