import json
import pathlib

from datasets import Dataset
from ragas import evaluate
from ragas.metrics import ExactMatch

ROOT = pathlib.Path(__file__).resolve().parents[1]


def load_cases():
    text = (ROOT / "data" / "sql_cases.jsonl").read_text(encoding="utf-8")
    rows = [json.loads(line) for line in text.splitlines() if line.strip()]
    return Dataset.from_list(
        [
            {
                "user_input": r["user_input"],
                "response": r["response"].strip(),
                "reference": r["reference"].strip(),
            }
            for r in rows
        ]
    )


def main():
    result = evaluate(load_cases(), metrics=[ExactMatch()])
    print(result)
    assert result["exact_match"] >= 0.95, f"sql gate: {result}"


if __name__ == "__main__":
    main()
