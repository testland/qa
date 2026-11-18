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
