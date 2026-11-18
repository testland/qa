# Our Ragas script broke after the upgrade

## Problem Description

Our Ragas script (`eval/run_eval.py`) broke after upgrading Ragas, and we're not sure the scores ever meant anything (`eval/README.md`). Rewrite it for the current Ragas and propose the CI gate.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: eval/run_eval.py ===============
import json
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_recall, context_precision

rows = [json.loads(l) for l in open("eval/traces.jsonl")]   # question, answer, contexts (from production logs)
ds = Dataset.from_dict({
    "question": [r["question"] for r in rows],
    "answer": [r["answer"] for r in rows],
    "contexts": [r["contexts"] for r in rows],
    "ground_truth": [r["answer"] for r in rows],   # no labelled answers yet, so reuse the bot's answer
})
result = evaluate(ds, metrics=[faithfulness, answer_relevancy, context_recall, context_precision])
print(result)
assert result["faithfulness"] > 0.8

=============== FILE: eval/README.md ===============
- 12 traces in eval/traces.jsonl. Context recall and precision always score close to 1.0.
- After upgrading to the current Ragas, the script fails on imports and column names.
- We want this in CI on every PR that touches the retriever or the prompt.
