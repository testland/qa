from build_dataset import build
from ragas import evaluate
from ragas.metrics import faithfulness

BAR = 0.90

result = evaluate(build(), metrics=[faithfulness])
df = result.to_pandas()
score = float(df["faithfulness"].mean())
print(df[["question", "faithfulness"]].to_string())
print(f"grounding {score:.2f} (bar {BAR})")
assert score >= BAR, f"grounding below bar: {score:.2f}"
