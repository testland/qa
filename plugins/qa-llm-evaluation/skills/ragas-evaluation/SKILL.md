---
name: ragas-evaluation
description: "Authors and runs Ragas - RAG-pipeline evaluation framework with metrics organized into RAG (Faithfulness, Response Relevancy, Context Precision/Recall, Context Entities Recall, Noise Sensitivity), Natural Language Comparison (Factual Correctness, Semantic Similarity, BLEU/ROUGE/CHRF/Exact Match), Agents/Tool-Use (Topic Adherence, Tool Call Accuracy/F1, Agent Goal Accuracy), General Purpose (Aspect Critic, Rubrics-based Scoring), Nvidia (Answer Accuracy, Context Relevance, Response Groundedness), and Summarization. Use when the user evaluates a RAG pipeline (retriever + generator) and needs the deepest metric variety in the OSS LLM-eval space."
---

# ragas-evaluation

[rg-gh]: https://github.com/explodinggradients/ragas

The model: assemble a dataset (question + answer + retrieval
contexts + ground truth), import the metrics relevant to the
evaluation goal, run `evaluate()`, and inspect per-metric per-row
scores (per [rg-gh][rg-gh]).

## When to use

- The repo uses LangChain / LlamaIndex / Haystack / direct
  retriever→LLM RAG pipelines.
- You need RAG-specific retrieval + generation quality scoring, or
  agents-style eval (tool-call and goal accuracy), and want the widest
  metric variety in OSS LLM-eval.

For non-RAG prompt evals, prefer `promptfoo-evaluation`.
For pytest-native LLM evals with a managed dashboard, prefer
`deepeval-evaluation`.

## Step 1 - Install

Per [rg-gh][rg-gh]:

```bash
pip install ragas
```

Or from source:

```bash
pip install git+https://github.com/explodinggradients/ragas
```

## Step 2 - Custom metric quickstart

Per [rg-gh][rg-gh] (verbatim):

```python
import asyncio
from openai import AsyncOpenAI
from ragas.metrics import DiscreteMetric
from ragas.llms import llm_factory

# Setup your LLM
client = AsyncOpenAI()
llm = llm_factory("gpt-4o", client=client)

# Create a custom aspect evaluator
metric = DiscreteMetric(
    name="summary_accuracy",
    allowed_values=["accurate", "inaccurate"],
    prompt="""Evaluate if the summary is accurate and captures
key information.
Response: {response}
Answer with only 'accurate' or 'inaccurate'."""
)

# Score your application's output
async def main():
    score = await metric.ascore(
        llm=llm,
        response="The summary of the text is..."
    )
    print(f"Score: {score.value}")
    print(f"Reason: {score.reason}")

if __name__ == "__main__":
    asyncio.run(main())
```

`DiscreteMetric` is the pattern for custom rubric-based scoring;
the built-in metrics in Step 3 follow a similar shape but are
preconfigured.

## Step 3 - Pick metrics

Ragas ships 30+ metrics across RAG, Natural Language Comparison,
Agents/Tool-Use, SQL, General Purpose, Nvidia, and Summarization
families. The RAG core: Faithfulness (claims grounded in retrieved
context), Response Relevancy, Context Precision, and Context Recall.
Pick 3 - 5 per pipeline.

Full per-family catalog with each metric's use:
[references/metrics.md](references/metrics.md), sourced from
[docs.ragas.io/en/stable/concepts/metrics/available_metrics/][rg-metrics].

[rg-metrics]: https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/

## Step 4 - Dataset shape

Ragas accepts a Hugging Face `Dataset` or `pandas.DataFrame` with
columns matching the metrics being run:

| Column | Required by |
|---|---|
| `question` | All RAG metrics |
| `answer` | Response Relevancy, Faithfulness, NL Comparison |
| `contexts` (list of strings) | Context Precision/Recall, Faithfulness |
| `ground_truth` | Context Recall, Factual Correctness, Answer Accuracy |
| `reference_contexts` | Context-comparison metrics |

See the per-metric pages on [docs.ragas.io][rg-docs] for exact
required-column lists.

[rg-docs]: https://docs.ragas.io/

## Step 5 - Integration with retrieval frameworks

Ragas integrates with LangChain + LlamaIndex retrieval pipelines - 
the integration code captures `contexts` from the retriever and
`answer` from the generator into the evaluation dataset
automatically. Consult the per-framework integration docs on
[docs.ragas.io][rg-docs] when wiring; APIs evolve faster than this
skill body and the canonical doc is the source of truth.

## Step 6 - CI integration

Ragas does not ship a first-party CI action. Pattern: run
`evaluate()` in a pytest fixture or a CLI script, compare per-metric
scores against thresholds, fail CI on regression.

```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy

result = evaluate(dataset, metrics=[faithfulness, answer_relevancy])
assert result["faithfulness"] >= 0.85
assert result["answer_relevancy"] >= 0.80
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Run all 30+ metrics on every PR | Cost + latency explode | Pick 3 - 5 metrics per pipeline (Step 3) |
| Faithfulness without `contexts` column | Metric returns NaN / errors | Pass `contexts` per dataset spec (Step 4) |
| Pin nothing | Ragas + judge-model versions both drift | Pin both in requirements + CI env |
| Skip Aspect Critic for product-specific concerns | Built-in metrics miss the requirement | Custom Aspect Critic + rubric (Step 3) |

## Limitations

- Many metrics require a judge LLM → cost scales with metric count
  × dataset size.
- Multimodal metrics need the multimodal extras (`pip install
  ragas[multimodal]`); check the per-metric doc on
  [docs.ragas.io][rg-docs].
- API surface evolves - pin versions in requirements; the canonical
  doc is the source of truth (this skill body curates the mainstream
  patterns but does not re-litigate per-method signatures).

## References

- [rg-gh][rg-gh] - repository + install
- [rg-metrics][rg-metrics] - full metric catalog
- [rg-docs][rg-docs] - full documentation including per-metric pages,
  integration guides
- `deepeval-evaluation`,
  `promptfoo-evaluation` - 
  sister tools (different framework styles)
