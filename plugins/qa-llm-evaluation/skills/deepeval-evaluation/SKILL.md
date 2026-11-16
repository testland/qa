---
name: deepeval-evaluation
description: "Use for any question or task about testing an LLM or RAG app with pytest, including hallucination checks in CI and answers that invent facts missing from the retrieved documents: DeepEval LLMTestCase, built-in metrics such as G-Eval, answer relevancy, faithfulness, contextual recall and precision, hallucination, bias and toxicity, deepeval test run with assert_test, and the Confident AI dashboard."
---

# deepeval-evaluation

## Overview

[de-gh]: https://github.com/confident-ai/deepeval
[de-start]: https://deepeval.com/docs/getting-started
[de-halluc]: https://deepeval.com/docs/metrics-hallucination
[de-multiturn]: https://deepeval.com/docs/evaluation-multiturn-test-cases
[de-role]: https://deepeval.com/docs/metrics-role-adherence
[de-retention]: https://deepeval.com/docs/metrics-knowledge-retention
[de-completeness]: https://deepeval.com/docs/metrics-conversation-completeness

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
| `retrieval_context` | optional | The chunks your retriever actually returned for this input, at test time. Faithfulness and the Contextual-* metrics judge against it |
| `context` | optional | Ground-truth reference text you supply. Only HallucinationMetric reads it; passing retrieved chunks here leaves Faithfulness with nothing to check ([de-halluc][de-halluc]) |

## Step 3b - A golden set that can fail

A suite only catches what its cases can expose. Three gaps let an inventing
bot pass:

- **Expected answers copied from the app.** If `expected_output` was saved
  from the bot's own replies, every comparison metric measures the bot
  against itself. Write expected answers by hand, or have a person check
  each one against the source documents.
- **No unanswerable questions.** Add questions the knowledge base does not
  answer (a policy it never mentions, a product you do not sell) and check
  the reply declines, says it does not know, or hands off. Use a G-Eval
  criterion for that behaviour, since an answer-relevancy metric rewards a
  confident invented answer:

```python
from deepeval.metrics import GEval
from deepeval.test_case import SingleTurnParams

JUDGE_MODEL = "<one dated judge model id>"  # pinned once, used by every metric

declines = GEval(
    name="Declines when the docs are silent",
    criteria="The retrieved context does not answer the question. Pass only if the "
             "actual output says it cannot confirm the answer or offers a hand-off, "
             "and states no policy, number or date that is absent from the context.",
    evaluation_params=[SingleTurnParams.INPUT, SingleTurnParams.ACTUAL_OUTPUT,
                       SingleTurnParams.RETRIEVAL_CONTEXT],
    threshold=0.8,
    model=JUDGE_MODEL,
)
```

- **Only happy-path topics.** Cover the questions that went wrong in
  production and the ones with exact facts (windows, prices, limits).

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

## Step 6b - Multi-turn conversations

Conversations use `ConversationalTestCase` with a list of `Turn` objects
(`role` is `"user"` or `"assistant"`) ([de-multiturn][de-multiturn]).
`RoleAdherenceMetric` needs `chatbot_role` on the test case
([de-role][de-role]); `KnowledgeRetentionMetric` flags a bot that asks again
for, or forgets, what the user already said ([de-retention][de-retention]);
`ConversationCompletenessMetric` checks every user request was handled
([de-completeness][de-completeness]).

```python
from deepeval import assert_test
from deepeval.metrics import (ConversationCompletenessMetric,
                              KnowledgeRetentionMetric, RoleAdherenceMetric)
from deepeval.test_case import ConversationalTestCase, Turn

convo = ConversationalTestCase(
    chatbot_role="Support assistant for Acme Bank; never gives investment advice.",
    turns=[
        Turn(role="user", content="My card ending 4471 was declined twice today."),
        Turn(role="assistant", content="Sorry about that. Was it online or in a shop?"),
        Turn(role="user", content="Online. Also, should I buy Acme shares?"),
        Turn(role="assistant", content="Which card was it again?"),
    ],
)
assert_test(convo, [
    RoleAdherenceMetric(threshold=0.8, model=JUDGE_MODEL),
    KnowledgeRetentionMetric(threshold=0.8, model=JUDGE_MODEL),
    ConversationCompletenessMetric(threshold=0.8, model=JUDGE_MODEL),
])
```

The older `ConversationalTestCase(messages=[LLMTestCase(...)])` form is not
the current API; rewrite such tests to `turns=[Turn(...)]`.

## Step 7 - CI integration

```bash
deepeval test run tests/llm/ --run-async --workers 4
# pytest exit code propagates: nonzero if any assert_test fails
```

Combine with Confident-AI for a dashboard view of run history;
Confident-AI is the company behind DeepEval (per [de-gh][de-gh]).


### Stable verdicts

LLM-judge scores move between runs on the same output. Rerunning a job until
it passes turns the suite into a coin toss.

- Pin the judge on every metric (`model=JUDGE_MODEL`, one constant), so a
  provider default change does not move your scores.
- Measure the spread: run the borderline cases several times and look at the
  score range. Set thresholds outside that noise band, or average repeated
  measurements for those cases.
- Prefer a deterministic check wherever the rule allows one (a regex for a
  required disclaimer, an exact value for a refund window) and keep the
  LLM judge for what only a judge can assess.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `threshold=0.0` on every metric | Tests never fail; eval theater | Pick real thresholds (0.5 - 0.8 typical) |
| `expected_output` saved from the app's own replies | Circular: the bot is graded against itself | Hand-written or human-checked expected answers (Step 3b) |
| No unanswerable questions in the set | Invented answers to questions the docs never cover go untested | Add them and check the bot declines (Step 3b) |
| Rerunning CI until the judge passes | Borderline scores flip; the suite stops meaning anything | Pin the judge model, measure spread, set thresholds outside it |
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
  pure prompt evals, `promptfoo-evaluation`
  is lower-friction.

## References

- [de-gh][de-gh] - repository, install, quickstart, metric list
- [de-start][de-start] - getting-started overview
- [de-halluc][de-halluc] - HallucinationMetric reads `context`, not `retrieval_context`
- [de-multiturn][de-multiturn] - `ConversationalTestCase` and `Turn`
- [de-role][de-role], [de-retention][de-retention], [de-completeness][de-completeness] - multi-turn metrics
- `promptfoo-evaluation`,
  `ragas-evaluation` - sister tools
  (Promptfoo for YAML-config; Ragas for deeper RAG metric variety)
