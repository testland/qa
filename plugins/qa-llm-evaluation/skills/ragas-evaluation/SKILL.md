---
name: ragas-evaluation
description: Authors and runs Ragas — RAG-pipeline evaluation framework with metrics organized into RAG (Faithfulness, Response Relevancy, Context Precision/Recall, Context Entities Recall, Noise Sensitivity), Natural Language Comparison (Factual Correctness, Semantic Similarity, BLEU/ROUGE/CHRF/Exact Match), Agents/Tool-Use (Topic Adherence, Tool Call Accuracy/F1, Agent Goal Accuracy), General Purpose (Aspect Critic, Rubrics-based Scoring), Nvidia (Answer Accuracy, Context Relevance, Response Groundedness), and Summarization. Use when the user evaluates a RAG pipeline (retriever + generator) and needs the deepest metric variety in the OSS LLM-eval space.
rating: 22
d6: 4
archetype: S1
---

# ragas-evaluation

## Overview

Ragas (per [github.com/explodinggradients/ragas][rg-gh]) is an
"Evaluation framework for your AI Application" with the deepest
metric catalog of any open-source LLM eval library — particularly
strong on RAG pipelines.

[rg-gh]: https://github.com/explodinggradients/ragas

The model: assemble a dataset (question + answer + retrieval
contexts + ground truth), import the metrics relevant to the
evaluation goal, run `evaluate()`, and inspect per-metric per-row
scores.

## When to use

- The repo uses LangChain / LlamaIndex / Haystack / direct
  retriever→LLM RAG pipelines.
- The user needs RAG-specific metrics: faithfulness (hallucination
  on retrieved context), context precision/recall (retrieval
  quality), context entities recall, noise sensitivity.
- The team needs many metrics and wants the most active OSS RAG-eval
  library (Ragas + DeepEval are the leaders here).
- Agents-style eval (tool-call accuracy, agent goal accuracy, topic
  adherence) is in scope.

For non-RAG prompt evals, prefer [`promptfoo-evaluation`](../promptfoo-evaluation/SKILL.md).
For pytest-native LLM evals with a managed dashboard, prefer
[`deepeval-evaluation`](../deepeval-evaluation/SKILL.md).

## Step 1 — Install

Per [rg-gh][rg-gh]:

```bash
pip install ragas
```

Or from source:

```bash
pip install git+https://github.com/explodinggradients/ragas
```

## Step 2 — Custom metric quickstart

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

## Step 3 — Built-in metric catalog

Per [docs.ragas.io/en/stable/concepts/metrics/available_metrics/][rg-metrics]:

[rg-metrics]: https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/

**Retrieval Augmented Generation:**

| Metric | Use |
|---|---|
| Context Precision | Are the relevant chunks ranked high in the retrieved context? |
| Context Recall | Does the retrieved context contain ground-truth info? |
| Context Entities Recall | Entity-level recall vs ground truth |
| Noise Sensitivity | Does irrelevant context degrade output quality? |
| Response Relevancy | Does the response address the question? |
| Faithfulness | Are the response's claims grounded in retrieved context? |
| Multimodal Faithfulness | Faithfulness for text+image RAG |
| Multimodal Relevance | Relevance for text+image RAG |

**Nvidia Metrics** (per [rg-metrics][rg-metrics]):

| Metric | Use |
|---|---|
| Answer Accuracy | Nvidia-blessed accuracy scoring |
| Context Relevance | Relevance scoring with Nvidia methodology |
| Response Groundedness | Groundedness in retrieved context |

**Agents/Tool Use:**

| Metric | Use |
|---|---|
| Topic Adherence | Does the agent stay on topic? |
| Tool Call Accuracy | Did it call the right tool? |
| Tool Call F1 | F1 score for tool selection |
| Agent Goal Accuracy | Did the agent achieve the user's goal? |

**Natural Language Comparison:**

| Metric | Use |
|---|---|
| Factual Correctness | Compares response facts vs ground truth |
| Semantic Similarity | Embedding-based similarity to reference |
| Non LLM String Similarity | String-distance metrics (no LLM call) |
| BLEU Score / ROUGE Score / CHRF Score | Classical NLP metrics |
| String Presence | Token presence check |
| Exact Match | Strict equality |

**SQL:**

| Metric | Use |
|---|---|
| Execution-based Datacompy Score | Run query, compare result-sets |
| SQL Query Equivalence | Semantic equivalence (different SQL, same result) |

**General Purpose:**

| Metric | Use |
|---|---|
| Aspect Critic | Yes/no LLM-judge on a custom aspect |
| Simple Criteria Scoring | Numeric scoring against a rubric |
| Rubrics-based Scoring | Multi-criterion rubric scoring |
| Instance-specific Rubrics Scoring | Per-row rubric variation |

**Other:**

| Metric | Use |
|---|---|
| Summarization | Summary quality scoring |

## Step 4 — Dataset shape

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

## Step 5 — Integration with retrieval frameworks

Ragas integrates with LangChain + LlamaIndex retrieval pipelines —
the integration code captures `contexts` from the retriever and
`answer` from the generator into the evaluation dataset
automatically. Consult the per-framework integration docs on
[docs.ragas.io][rg-docs] when wiring; APIs evolve faster than this
skill body and the canonical doc is the source of truth.

## Step 6 — CI integration

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
| Run all 30+ metrics on every PR | Cost + latency explode | Pick 3–5 metrics per pipeline (Step 3) |
| Faithfulness without `contexts` column | Metric returns NaN / errors | Pass `contexts` per dataset spec (Step 4) |
| Pin nothing | Ragas + judge-model versions both drift | Pin both in requirements + CI env |
| Skip Aspect Critic for product-specific concerns | Built-in metrics miss the requirement | Custom Aspect Critic + rubric (Step 3) |

## Limitations

- Many metrics require a judge LLM → cost scales with metric count
  × dataset size.
- Multimodal metrics need the multimodal extras (`pip install
  ragas[multimodal]`); check the per-metric doc on
  [docs.ragas.io][rg-docs].
- API surface evolves — pin versions in requirements; the canonical
  doc is the source of truth (this skill body curates the mainstream
  patterns but does not re-litigate per-method signatures).

## References

- [rg-gh][rg-gh] — repository + install
- [rg-metrics][rg-metrics] — full metric catalog
- [rg-docs][rg-docs] — full documentation including per-metric pages,
  integration guides
- [`deepeval-evaluation`](../deepeval-evaluation/SKILL.md),
  [`promptfoo-evaluation`](../promptfoo-evaluation/SKILL.md) —
  sister tools (different framework styles)
- [`prompt-eval-reviewer`](../../agents/prompt-eval-reviewer.md) —
  adversarial reviewer
