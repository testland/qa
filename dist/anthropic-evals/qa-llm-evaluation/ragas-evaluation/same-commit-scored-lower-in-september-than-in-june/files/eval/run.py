import pathlib

import yaml
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    answer_relevancy,
    context_precision,
    context_recall,
    faithfulness,
)

ROOT = pathlib.Path(__file__).resolve().parents[1]
GATED = [faithfulness, answer_relevancy, context_recall, context_precision]


def main(golden, thresholds):
    floors = yaml.safe_load(pathlib.Path(thresholds).read_text(encoding="utf-8"))
    result = evaluate(Dataset.from_json(golden), metrics=GATED)
    print(result)
    for name, floor in floors.items():
        assert result[name] >= floor, f"{name} {result[name]:.2f} < {floor}"
