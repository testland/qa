from ragas.metrics import context_recall, faithfulness

GATED = [context_recall, faithfulness]

THRESHOLDS = {
    "context_recall": 0.85,
    "faithfulness": 0.90,
}
