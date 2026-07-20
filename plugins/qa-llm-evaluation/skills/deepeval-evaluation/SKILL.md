---
name: deepeval-evaluation
description: "Authors and runs DeepEval - pytest-native LLM eval framework with `LLMTestCase` (input + actual_output + expected_output + retrieval_context) and ~11 built-in metrics (G-Eval, Answer-Relevancy, Faithfulness, Contextual-Recall / Precision / Relevancy, Hallucination, Bias, Toxicity, Summarization, JSON-Correctness); runs via `deepeval test run {file.py}` with `assert_test()` per test or `evaluate()` for batch; integrates Confident-AI dashboard. Use when the user prefers pytest workflow, works with RAG and needs faithfulness/contextual metrics out-of-the-box, or wants a managed dashboard."
---

# deepeval-evaluation

## Overview

[de-gh]: https://github.com/confident-ai/deepeval
[de-start]: https://deepeval.com/docs/getting-started

Per [de-start][de-start], DeepEval is "an open-source LLM eval
package" enabling "evaluation of LLM applications locally through
test cases and metrics." The model: each test constructs an
`LLMTestCase`, applies one or more `Metric` instances, and either
asserts (`assert_test`) or batch-evaluates (`evaluate`). Pytest
discovery + reporting works unchanged.

## When to use

- The repo already uses pytest; LLM tests should live alongside
  unit tests.
- The user works with RAG and needs Faithfulness / Contextual-*
  metrics without writing them from scratch.
- The team wants a managed dashboard (Confident-AI) for regression
  tracking + prompt-vs-prompt comparison.
- Programmatic test-case authoring (data-driven from a CSV/JSONL)
  is needed and pytest fixtures fit better than YAML config.

## Step 1 - Install

Per [de-gh][de-gh] and [de-start][de-start]:

```bash
pip install -U deepeval
```

Optional Confident-AI login (for dashboard):

```bash
deepeval login
```

Per [de-start][de-start]: after login "Confident AI will generate
testing reports and automate regression testing whenever you run a
test run."

## Step 2 - First test

Per [de-gh][de-gh] (verbatim quickstart):

```python
import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, SingleTurnParams

def test_case():
    correctness_metric = GEval(
        name="Correctness",
        criteria="Determine if the 'actual output' is correct based on the 'expected output'.",
        evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.EXPECTED_OUTPUT],
        threshold=0.5
    )
    test_case = LLMTestCase(
        input="What if these shoes don't fit?",
        actual_output="You have 30 days to get a full refund at no extra cost.",
        expected_output="We offer a 30-day full refund at no extra costs.",
        retrieval_context=["All customers are eligible for a 30 day full refund at no extra costs."]
    )
    assert_test(test_case, [correctness_metric])
```

Run it:

```bash
deepeval test run test_chatbot.py
```

(Per [de-gh][de-gh].)

## Step 3 - LLMTestCase fields

Per [de-start][de-start], `LLMTestCase` fields:

| Field | Required | Notes |
|---|---|---|
| `input` | yes | The user prompt / query |
| `actual_output` | yes | What the LLM produced |
| `expected_output` | optional | Reference answer (used by metrics that compare) |
| `retrieval_context` | optional | List of retrieved chunks for RAG metrics |
| `context` | optional | Ground-truth context for hallucination metric |

## Step 4 - Metric catalog

Per [de-gh][de-gh] the available metrics include:

| Metric | Use |
|---|---|
| `GEval` | Custom rubric-based scoring (LLM-as-judge with chain-of-thought) |
| `AnswerRelevancyMetric` | Does `actual_output` answer `input`? |
| `FaithfulnessMetric` | Does `actual_output` only state facts in `retrieval_context`? |
| `ContextualRecallMetric` | Does `retrieval_context` contain enough info to produce `expected_output`? |
| `ContextualPrecisionMetric` | Are relevant chunks ranked higher in `retrieval_context`? |
| `ContextualRelevancyMetric` | Are chunks in `retrieval_context` relevant to `input`? |
| `HallucinationMetric` | Does `actual_output` contradict `context`? |
| `BiasMetric` | Bias detection in `actual_output` |
| `ToxicityMetric` | Toxic-content detection |
| `SummarizationMetric` | Summary quality vs source |
| `JsonCorrectnessMetric` | Valid + schema-conformant JSON output |

Each metric takes a `threshold` parameter; the test passes if score
≥ threshold.

## Step 5 - Custom GEval pattern

`GEval` is the universal escape hatch when no built-in metric fits:

```python
from deepeval.metrics import GEval
from deepeval.test_case import SingleTurnParams

professionalism = GEval(
    name="Professionalism",
    criteria="Determine if the response uses professional language without slang or contractions.",
    evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT],
    threshold=0.7,
)
```

The `criteria` string is the rubric; the judge model evaluates and
returns a 0 - 1 score with reasoning attached.

## Step 6 - Batch evaluation (no pytest)

For dataset-driven runs without pytest:

```python
from deepeval import evaluate

evaluate(test_cases=[case1, case2, case3], metrics=[g_eval, faithfulness])
```

Returns scores per metric per case; useful for regression sweeps
across a CSV/JSONL of historical inputs.

## Step 7 - CI integration

```bash
deepeval test run tests/llm/ --run-async --workers 4
# pytest exit code propagates: nonzero if any assert_test fails
```

Combine with Confident-AI for a dashboard view of run history;
Confident-AI is the company behind DeepEval (per [de-gh][de-gh]).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `threshold=0.0` on every metric | Tests never fail; eval theater | Pick real thresholds (0.5 - 0.8 typical) |
| Hallucination metric without `context` | Metric has nothing to compare against | Always pass `context` (Step 3) |
| Faithfulness metric without `retrieval_context` | Same problem | Pass retrieval chunks (Step 3) |
| Custom GEval criteria too vague | Judge produces inconsistent scores | Concrete criteria with examples (Step 5) |
| Skip `--workers` in CI | Sequential runs slow + costly | `--workers 4` parallelization (Step 7) |

## Limitations

- LLM-as-judge metrics depend on judge-model quality + cost; pin
  judge model version in CI.
- Confident-AI is the managed dashboard; without it, regression
  tracking is manual (parse pytest output).
- Test cases live in Python files - not as discoverable as YAML
  configs for non-Python teammates (vs Promptfoo).
- Faithfulness / Contextual-* metrics need RAG-shaped data; for
  pure prompt evals, [`promptfoo-evaluation`](../promptfoo-evaluation/SKILL.md)
  is lower-friction.

## References

- [de-gh][de-gh] - repository, install, quickstart, metric list
- [de-start][de-start] - getting-started overview
- [`promptfoo-evaluation`](../promptfoo-evaluation/SKILL.md),
  [`ragas-evaluation`](../ragas-evaluation/SKILL.md) - sister tools
  (Promptfoo for YAML-config; Ragas for deeper RAG metric variety)
