---
name: ragas-evaluation
description: "Use for any question or task about RAG or agent evaluation metrics, including which metrics to use, scoring an answer against its contexts, and telling retrieval problems from generation problems after a change such as chunk size: Ragas faithfulness, response relevancy, context precision and recall, noise sensitivity, factual correctness, tool-call accuracy, agent goal accuracy and rubric scoring."
---

# ragas-evaluation

[rg-gh]: https://github.com/explodinggradients/ragas

The model: assemble a dataset (`user_input` + `response` +
`retrieved_contexts` + `reference`), import the metrics relevant to the
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

Each row is a `SingleTurnSample`; build the set with
`EvaluationDataset.from_list([...])` ([rg-sample][rg-sample],
[rg-start][rg-start]). The fields match the metrics being run:

| Field | Required by |
|---|---|
| `user_input` (the question) | All RAG metrics |
| `response` (the generated answer) | Response Relevancy, Faithfulness, NL Comparison |
| `retrieved_contexts` (list of strings) | Context Precision/Recall, Faithfulness |
| `reference` (the ground-truth answer) | Context Recall, Factual Correctness, Answer Accuracy |
| `reference_contexts` | Context-comparison metrics |

Older tutorials use `question`, `answer`, `contexts` and `ground_truth`;
the current sample fields are the names above.

```python
from ragas import EvaluationDataset

dataset = EvaluationDataset.from_list([
    {
        "user_input": "When was the refund window extended?",
        "retrieved_contexts": ["Refunds are accepted within 60 days since March 2026."],
        "response": "In March 2026, to 60 days.",
        "reference": "March 2026",
    },
])
```

[rg-sample]: https://docs.ragas.io/en/stable/concepts/components/eval_sample/
[rg-start]: https://docs.ragas.io/en/stable/getstarted/rag_eval/

See the per-metric pages on [docs.ragas.io][rg-docs] for exact
required-column lists.

[rg-docs]: https://docs.ragas.io/

## Step 5 - Integration with retrieval frameworks

Ragas integrates with LangChain + LlamaIndex retrieval pipelines - 
the integration code captures `retrieved_contexts` from the retriever and
`response` from the generator into the evaluation dataset
automatically. Consult the per-framework integration docs on
[docs.ragas.io][rg-docs] when wiring; APIs evolve faster than this
skill body and the canonical doc is the source of truth.

## Step 5a - References must come from somewhere else

Reference-based metrics (Context Recall, Factual Correctness,
reference-based Context Precision) compare against `reference`. If the
reference is the bot's own answer copied in, the pipeline is graded
against itself and those scores sit near 1.0 whatever it retrieves.
Either write references by hand (or from a trusted source) for a
labelled set, or use the reference-free metrics until you have one:
`LLMContextPrecisionWithoutReference` (needs `user_input`, `response`,
`retrieved_contexts`) and `ContextUtilization`
([rg-ctx-precision][rg-ctx-precision]).

[rg-ctx-precision]: https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/

## Step 5b - Agents: score the tool calls, not only the reply

An agent can write a confident, relevant reply after calling a tool
with the wrong arguments; text metrics pass it. Score the calls with
`ToolCallAccuracy` against `reference_tool_calls`, on the conversation
as Ragas messages ([rg-agents][rg-agents]):

```python
from ragas.messages import HumanMessage, AIMessage, ToolMessage, ToolCall
from ragas.metrics.collections import ToolCallAccuracy, AgentGoalAccuracyWithReference

conversation = [
    HumanMessage(content="Book a 30-minute call with Dana next Tuesday afternoon."),
    AIMessage(content="Checking free slots.", tool_calls=[
        ToolCall(name="find_slots", args={"person": "dana", "date": "2026-03-10", "minutes": 30}),
    ]),
    ToolMessage(content='[{"id": "s-14", "start": "14:00"}]'),
    AIMessage(content="Booking 14:00.", tool_calls=[
        ToolCall(name="create_event", args={"slot_id": "s-14"}),
    ]),
    ToolMessage(content='{"status": "confirmed"}'),
    AIMessage(content="Done: Tuesday 14:00 with Dana."),
]
expected = [
    ToolCall(name="find_slots", args={"person": "dana", "date": "2026-03-10", "minutes": 30}),
    ToolCall(name="create_event", args={"slot_id": "s-14"}),
]

tool_score = await ToolCallAccuracy().ascore(user_input=conversation, reference_tool_calls=expected)
goal_score = await AgentGoalAccuracyWithReference(llm=llm).ascore(
    user_input=conversation, reference="A 30-minute event with Dana is booked on 2026-03-10.")
assert tool_score.value == 1.0, tool_score     # a wrong date gives partial credit, not 0
assert goal_score.value == 1.0, goal_score
```

What the metric does, per [rg-agents][rg-agents]:

- **Order is strict by default:** calls "must match exactly in
  sequence"; out-of-order calls score 0.0. Use
  `ToolCallAccuracy(strict_order=False)` only for calls that may run in
  parallel.
- **Arguments get partial credit:** the docs show "0.66 (2 out of 3
  arguments match)". A gate of `>= 0.5` therefore passes a call with a
  wrong date; require `1.0` for the arguments that matter, or check
  them exactly in code.
- **Check the outcome too.** `AgentGoalAccuracyWithReference` (or a
  plain assertion on the final booking record) catches a run whose
  calls look right but whose result is wrong.
- The legacy form (`MultiTurnSample` from `ragas.dataset_schema` and
  `multi_turn_ascore`) is deprecated and will be removed in 1.0.

[rg-agents]: https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/agents/

## Step 6 - CI integration

Ragas does not ship a first-party CI action. Pattern: score a labelled
set in a pytest test or script, compare with a stored baseline, fail CI
on a regression beyond a tolerance.

Use the current metric classes with an explicit judge. The lowercase
singletons (`from ragas.metrics import faithfulness`) and the
`SingleTurnSample` / `single_turn_ascore` pattern are the legacy API,
which "will be deprecated in version 0.4 and removed in version 1.0"
([rg-faithfulness][rg-faithfulness]):

```python
import asyncio, json, statistics
from openai import AsyncOpenAI
from ragas.llms import llm_factory
from ragas.metrics.collections import Faithfulness, ContextRecall

JUDGE = "gpt-4o-mini-2024-07-18"          # pinned snapshot, not a moving alias
llm = llm_factory(JUDGE, client=AsyncOpenAI())
faith, recall = Faithfulness(llm=llm), ContextRecall(llm=llm)

async def score(rows):
    f = [(await faith.ascore(user_input=r["user_input"], response=r["response"],
                             retrieved_contexts=r["retrieved_contexts"])).value for r in rows]
    c = [(await recall.ascore(user_input=r["user_input"], retrieved_contexts=r["retrieved_contexts"],
                              reference=r["reference"])).value for r in rows]
    return {"faithfulness": statistics.mean(f), "context_recall": statistics.mean(c)}

rows = json.load(open("eval/labelled.json"))       # human-written references
baseline = json.load(open("eval/baseline.json"))   # {"judge": ..., "faithfulness": ..., ...}
assert baseline["judge"] == JUDGE, "judge changed: re-baseline first"
current = asyncio.run(score(rows))
for metric, value in current.items():
    assert value >= baseline[metric] - 0.03, f"{metric} {value:.3f} < baseline {baseline[metric]:.3f}"
```

Why this shape:

- **Baseline plus tolerance, not one absolute threshold.** Judge scores
  vary from run to run; a fixed `>= 0.85` either flaps or is set so low
  it never fails.
- **Enough rows.** On 12 rows one answer moves the mean by 0.08, more
  than most real regressions; grow the labelled set before tightening
  the tolerance.
- **Pinned judge.** A new judge model shifts every score; re-baseline
  deliberately when you change it.

[rg-faithfulness]: https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Run all 30+ metrics on every PR | Cost + latency explode | Pick 3 - 5 metrics per pipeline (Step 3) |
| Faithfulness without `retrieved_contexts` | Metric returns NaN / errors | Pass `retrieved_contexts` per dataset spec (Step 4) |
| Pin nothing | Ragas + judge-model versions both drift | Pin both in requirements + CI env |
| `reference` copied from the bot's own answer | Reference-based metrics grade the pipeline against itself (~1.0) | Human-written references, or reference-free metrics (Step 5a) |
| Agent eval on the final text only | Wrong tool arguments still get a good reply score | `ToolCallAccuracy` + goal check (Step 5b) |
| Gate `>= 0.5` on `ToolCallAccuracy` | Partial argument credit passes a wrong argument | Require `1.0` on critical calls |
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
- [rg-faithfulness][rg-faithfulness] - collections API, legacy API deprecation
- [rg-ctx-precision][rg-ctx-precision] - reference-free context precision
- [rg-agents][rg-agents] - `ToolCallAccuracy` (strict order, partial
  argument credit), `AgentGoalAccuracyWithReference`
- [rg-docs][rg-docs] - full documentation including per-metric pages,
  integration guides
- `deepeval-evaluation`,
  `promptfoo-evaluation` - 
  sister tools (different framework styles)
