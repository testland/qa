# Eval API spend, August 2026

| Line                                          | Monthly |
|-----------------------------------------------|---------|
| Grading-model calls (`llm-rubric` assertions) | $1,910 |
| Model-under-test calls                        | $  540 |
| **Total**                                     | **$2,450** |

The suite runs on every pull request that touches `prompts/` or `eval/`. That
was 94 runs in August. It does not currently run on a schedule. Every run
evaluates all nine cases.

## Finance proposal (2026-09-09 review)

> Run a random 3 of the 9 ticket-summariser cases on each pull request, and the
> full 9 once a night. Modelled saving is about 60% of the grading line, call it
> $1,150 a month. Sign-off requested by 2026-09-19.
