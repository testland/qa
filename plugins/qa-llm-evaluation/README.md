# qa-llm-evaluation

LLM and prompt evaluation. Six per-tool skill wrappers covering the
mainstream OSS LLM-eval ecosystem (Promptfoo + OpenAI Evals +
DeepEval + Ragas for functional eval; Giskard for adversarial scan;
Langfuse for production observability + offline-eval feedback loop)
plus an adversarial reviewer agent that flags 8 anti-patterns
across any of these frameworks.

First Phase 4 plugin per the v2 master plan ("complete QA toolkit
for any team"). Closes the fastest-growing QA discipline gap of
2024–2026.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [promptfoo-evaluation](skills/promptfoo-evaluation/SKILL.md) | S1 | YAML-driven multi-provider evals with full assertion catalog (deterministic + model-graded + semantic + perf) |
| Skill | [openai-evals](skills/openai-evals/SKILL.md) | S1 | OpenAI's framework + registry; `oaieval` CLI; template + custom-Python evals |
| Skill | [deepeval-evaluation](skills/deepeval-evaluation/SKILL.md) | S1 | pytest-native; 11+ metrics including G-Eval / Faithfulness / Contextual-* / Hallucination / Bias / Toxicity / JSON-Correctness |
| Skill | [ragas-evaluation](skills/ragas-evaluation/SKILL.md) | S1 | Deepest RAG metric variety: Faithfulness, Context Precision/Recall, Noise Sensitivity, Agents/Tool-Use, NL Comparison, SQL, Aspect Critic |
| Skill | [giskard-llm](skills/giskard-llm/SKILL.md) | S1 | Adversarial scan with 7 vulnerability categories (hallucination, harmful_content, prompt_injection, sensitive_information_disclosure, stereotypes, robustness, basic_sycophancy) |
| Skill | [langfuse-tracing](skills/langfuse-tracing/SKILL.md) | S1 | Production observability with `@observe` decorator, score API, datasets for offline eval |
| Agent | [prompt-eval-reviewer](agents/prompt-eval-reviewer.md) | A3 | Adversarial reviewer flagging 8 anti-patterns across all 6 sister tools; preloads all 6 |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-llm-evaluation@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance) **with the v2
amendment D6=4 floor for Phase 4+ components** — every concrete
claim is cited inline at the point of use, not in an end-of-body
References-only section. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
