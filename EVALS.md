# Skill evals

An eval runs an agent on a realistic task twice - once without the skill, once
with it - and scores the difference. It measures whether a skill changes what
the agent produces, not whether the skill reads well.

## Layout

Scenarios live inside the skill they measure, which is also the directory
`tessl skill publish` uploads:

```
plugins/<plugin>/skills/<skill>/evals/<scenario>/
├── task.md         # the request the agent sees, fixture included inline
└── criteria.json   # weighted rubric
```

## task.md

Written by a person, phrased as a developer would phrase it. It never names the
skill, its API, or its vocabulary - if the prompt leaks the answer the run
measures reading comprehension.

Fixtures are embedded as text under an `## Input Files` heading with
`=============== FILE: path ===============` separators and the instruction to
extract them first. No fixture generation, no external repositories.

Prefer fixtures that run under `node --test` with no dependencies, so the
suite can be executed rather than only read. Ship existing passing tests in the
fixture; a repository with no tests turns every prompt into "add the first
test" and flattens the thing being measured.

## criteria.json

```json
{
  "context": "What the agent without the skill is predicted to get wrong.",
  "type": "weighted_checklist",
  "checklist": [
    { "name": "...", "max_score": 30, "description": "..." }
  ]
}
```

Score is the sum of awarded points over the sum of `max_score`, with partial
credit. Weights need not total 100.

Four rules, each of which exists because its absence produced a measurement
that could not discriminate:

1. **`context` states the predicted baseline failure**, not the ideal answer. A
   rubric written from the ideal is satisfied by any competent attempt.
2. **Weight by discrimination.** Deliverable-exists checks get 4. The one thing
   the skill uniquely supplies gets 20-35. Conventions get 8-18.
3. **At least one MUST_NOT per rubric**, taken from the skill's own
   `## Anti-patterns` table - those rows are human-authored and already say what
   going wrong looks like.
4. **State the zero and half conditions** in the description, so a partial
   answer lands somewhere defensible instead of on a grader's mood.

## Running

Locally, the harness in `C:\GitHub\.qa-eval\pilot` runs both arms and applies
the deterministic gate - delivered, collects, executes, passes - before any
model grades anything. A run that delivered no test file is not a low score, it
is not a result.

On Tessl, `tessl eval run <skill-dir>` consumes the same files and returns an
independent judgement plus a registry impact score.

## Maintaining

A criterion that scores identically at ceiling or floor in both arms is not
discriminating. **Reweight it, do not delete it** - it still verifies the
artifact, it just should not move the delta. Because criteria are committed,
this converges; regenerating rubrics per run produces a new instrument each
time and nothing is comparable to anything.
