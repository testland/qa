import json
import pathlib

from datasets import Dataset
from ragas import evaluate

from eval.metrics import GATED, THRESHOLDS

ROOT = pathlib.Path(__file__).resolve().parents[1]


def load_golden():
    text = (ROOT / "data" / "golden.jsonl").read_text(encoding="utf-8")
    return Dataset.from_list([json.loads(line) for line in text.splitlines() if line.strip()])


def main():
    result = evaluate(load_golden(), metrics=GATED)
    print(result)
    for name, floor in THRESHOLDS.items():
        assert result[name] >= floor, f"{name} {result[name]:.2f} below {floor}"


if __name__ == "__main__":
    main()
