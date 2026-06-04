# qa-llm-evaluation

LLM and prompt evaluation. Six per-tool skill wrappers covering the
mainstream OSS LLM-eval ecosystem (Promptfoo + OpenAI Evals +
DeepEval + Ragas for functional eval; Giskard for adversarial scan;
Langfuse for production observability + offline-eval feedback loop)
plus an adversarial reviewer agent that flags 8 anti-patterns
across any of these frameworks.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [promptfoo-evaluation](skills/promptfoo-evaluation/SKILL.md) | YAML-driven multi-provider evals with full assertion catalog (deterministic + model-graded + semantic + perf) |
| Skill | [openai-evals](skills/openai-evals/SKILL.md) | OpenAI's framework + registry; `oaieval` CLI; template + custom-Python evals |
| Skill | [deepeval-evaluation](skills/deepeval-evaluation/SKILL.md) | pytest-native; 11+ metrics including G-Eval / Faithfulness / Contextual-* / Hallucination / Bias / Toxicity / JSON-Correctness |
| Skill | [ragas-evaluation](skills/ragas-evaluation/SKILL.md) | Deepest RAG metric variety: Faithfulness, Context Precision/Recall, Noise Sensitivity, Agents/Tool-Use, NL Comparison, SQL, Aspect Critic |
| Skill | [giskard-llm](skills/giskard-llm/SKILL.md) | Adversarial scan with 7 vulnerability categories (hallucination, harmful_content, prompt_injection, sensitive_information_disclosure, stereotypes, robustness, basic_sycophancy) |
| Skill | [langfuse-tracing](skills/langfuse-tracing/SKILL.md) | Production observability with `@observe` decorator, score API, datasets for offline eval |
| Agent | [prompt-eval-reviewer](agents/prompt-eval-reviewer.md) | Adversarial reviewer flagging 8 anti-patterns across all 6 sister tools; preloads all 6 |
| Agent | [llm-red-team-planner](agents/llm-red-team-planner.md) | Plans an LLM red-team campaign across an attack taxonomy, composing Giskard scans + promptfoo red-team configs. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-llm-evaluation@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
