# Eval API spend, August 2026

| Line                                         | Monthly |
|----------------------------------------------|---------|
| Grading-model calls (llm-rubric assertions)  | $1,910 |
| Model-under-test calls                       | $  540 |
| **Total**                                    | **$2,450** |

The suite runs on every pull request that touches `prompts/` or `eval/`, which
was 94 runs in August. Grading calls are 78% of the line. Deterministic
assertions are evaluated locally and cost nothing.

## Finance proposal (from the 2026-09-09 review)

> Run a random 3 of the 8 ticket-summariser cases per pull request, and the
> full 8 nightly. Modelled saving is about 60% of the grading line, roughly
> $1,150 a month. Sign-off requested by 2026-09-19.
