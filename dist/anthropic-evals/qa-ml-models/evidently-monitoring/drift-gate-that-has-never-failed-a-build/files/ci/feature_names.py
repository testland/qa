MODEL_FEATURES = [
    "employment_status",
    "months_at_address",
    "monthly_income",
    "requested_amount",
    "existing_debt_ratio",
    "prior_defaults",
]

WAREHOUSE_COLUMNS = MODEL_FEATURES + [
    "application_id",
    "submitted_at",
    "decision",
]
