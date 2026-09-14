import json
import pathlib

from datasets import Dataset

ROOT = pathlib.Path(__file__).resolve().parents[1]


def _load(rel):
    text = (ROOT / rel).read_text(encoding="utf-8")
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def build():
    answers = {r["id"]: r for r in _load("logs/answers.jsonl")}
    rows = []
    for case in _load("data/eval_set.jsonl"):
        logged = answers[case["id"]]
        rows.append(
            {
                "question": case["question"],
                "answer": logged["answer"],
                # passages the assistant cited underneath the answer
                "contexts": [c["text"] for c in logged["citations"]],
            }
        )
    return Dataset.from_list(rows)
