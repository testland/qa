"""Monthly training export for risk-scorer. Run by the training DAG."""

from pathlib import Path

from sklearn.model_selection import train_test_split

from warehouse import query

OUT = Path("data")

SOURCE_SQL = """
select application_id, submitted_at, employment_status, months_at_address,
       monthly_income, requested_amount, existing_debt_ratio, prior_defaults,
       decision
from warehouse.applications
where decided_at < date '2026-03-01'
  and decision is not null
"""


def main() -> None:
    df = query(SOURCE_SQL)
    fit, held_out = train_test_split(df, test_size=0.2, random_state=7)

    fit.to_parquet(OUT / "train_full.parquet")
    fit.sample(50_000, random_state=7).to_parquet(OUT / "train_sample.parquet")
    held_out.to_parquet(OUT / "candidate_eval.parquet")


if __name__ == "__main__":
    main()
