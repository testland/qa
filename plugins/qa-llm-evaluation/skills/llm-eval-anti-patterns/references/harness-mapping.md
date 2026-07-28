# Mapping the five slots across harnesses

The eight checks are structural, not syntactic. Every harness has the same
five slots - case set, system under test, assertions/scorers, judge
configuration, and the CI gate - under different vocabulary.

- **Promptfoo**: `tests`, `providers`, `assert`, the grading provider, and the
  CI job (per
  [promptfoo.dev/docs/configuration/guide](https://promptfoo.dev/docs/configuration/guide/)
  and
  [promptfoo.dev/docs/configuration/expected-outputs](https://promptfoo.dev/docs/configuration/expected-outputs/)).
- **LangSmith**: the dataset, the target application, the evaluators (human
  review, code-based rules, LLM-as-judge, or pairwise comparison), and the
  experiment (per
  [docs.langchain.com/langsmith/evaluation](https://docs.langchain.com/langsmith/evaluation)).
- **Braintrust**: an eval is data plus a task plus scorers, recorded as an
  experiment that CI compares over time to catch regressions (per
  [braintrust.dev/docs/guides/evals](https://www.braintrust.dev/docs/guides/evals)).
- **DeepEval**: the parameterized test data, the metric objects, and their
  thresholds (per
  [deepeval.com/docs/metrics-llm-evals](https://deepeval.com/docs/metrics-llm-evals)).
- **OpenAI Evals**: the JSON data file and the YAML eval parameters (per
  [github.com/openai/evals](https://github.com/openai/evals)).

Where a check in SKILL.md names an exact key, that key is verified in that one
harness's linked documentation. Everywhere else the description is deliberately
structural so it transfers to a bespoke in-house harness once its five slots
are mapped by hand.
