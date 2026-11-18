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
