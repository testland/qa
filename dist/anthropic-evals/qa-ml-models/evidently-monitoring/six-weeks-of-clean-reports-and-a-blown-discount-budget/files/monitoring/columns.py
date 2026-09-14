"""Column roles for the quote-accept monitoring job."""

SCHEMA = [
    "quote_id",
    "driver_age",
    "licence_years",
    "vehicle_value_gbp",
    "vehicle_group",
    "annual_mileage",
    "postcode_risk_band",
    "ncd_years",
    "claims_5y",
    "convictions_5y",
    "cover_type",
    "voluntary_excess_gbp",
    "payment_frequency",
    "quoted_premium_gbp",
    "competitor_price_index",
    "channel",
    "device_type",
    "quote_hour",
    "is_renewal",
    "multi_policy_eligible",
    "previous_insurer",
    "add_ons_count",
    "score",
    "label",
]

PREDICTION_COLUMN = "score"
TARGET_COLUMN = "label"

MONITORED = [c for c in SCHEMA if c not in ("quote_id", TARGET_COLUMN)]
