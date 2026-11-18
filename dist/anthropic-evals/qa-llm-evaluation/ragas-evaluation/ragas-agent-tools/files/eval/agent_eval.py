from ragas import evaluate
from ragas.metrics import answer_correctness
from datasets import Dataset

# only the final message of each conversation is scored
ds = Dataset.from_dict({
    "question": ["Book me the cheapest flight from LCA to LHR on 12 December"],
    "answer": ["Done! You're booked on the cheapest flight to London Heathrow on 12 December."],
    "ground_truth": ["Booked the cheapest LCA to LHR flight on 2026-12-12."],
})
print(evaluate(ds, metrics=[answer_correctness]))
