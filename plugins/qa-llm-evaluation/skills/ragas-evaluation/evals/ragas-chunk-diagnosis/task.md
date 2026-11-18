# Chunks went from 512 to 2048 tokens: is retrieval or generation worse?

## Problem Description

We changed the chunk size from 512 to 2048 tokens (`eval/results.md`). Tell us whether the regression is in retrieval or in generation, and fix what is wrong in how we evaluate (`eval/run_eval.py`).

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: eval/run_eval.py ===============
from ragas import evaluate, EvaluationDataset
from ragas.metrics import Faithfulness, ResponseRelevancy, LLMContextRecall, LLMContextPrecisionWithReference

from app import rag_app
from eval.io import load_jsonl

rows = load_jsonl("eval/questions.jsonl")   # {"question": ..., "ground_truth": ...}, 180 rows, 40 have no ground_truth
samples = []
for r in rows:
    out = rag_app.ask(r["question"])         # .answer and .chunks (top 5)
    samples.append({
        "user_input": r["question"],
        "retrieved_contexts": out.chunks,
        "response": out.answer,
        "reference": out.answer,              # ground_truth is sometimes empty, so use the answer for every row
    })

result = evaluate(
    EvaluationDataset.from_list(samples),
    metrics=[Faithfulness(), ResponseRelevancy(), LLMContextRecall(), LLMContextPrecisionWithReference()],
)
print(result)

=============== FILE: eval/results.md ===============
| metric | chunk 512 | chunk 2048 |
|---|---|---|
| faithfulness | 0.91 | 0.90 |
| answer_relevancy | 0.88 | 0.79 |
| context_recall | 0.97 | 0.98 |
| context_precision | 0.81 | 0.52 |

Users say answers got longer and vaguer after the switch to 2048-token chunks.
