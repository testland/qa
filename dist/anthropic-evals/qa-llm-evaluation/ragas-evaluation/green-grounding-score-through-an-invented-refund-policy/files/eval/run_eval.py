import csv
import pathlib

from build_dataset import build
from ragas import evaluate
from ragas.metrics import faithfulness

ROOT = pathlib.Path(__file__).resolve().parents[1]
BAR = 0.90

result = evaluate(build(), metrics=[faithfulness])
df = result.to_pandas()
score = float(df["faithfulness"].mean())

out = ROOT / "reports" / "nightly.csv"
df[["question", "faithfulness"]].to_csv(out, index=False, quoting=csv.QUOTE_MINIMAL)

print(f"rows evaluated: {len(df)}")
print(f"grounding {score:.2f} (bar {BAR})")
assert score >= BAR, f"grounding below bar: {score:.2f}"
