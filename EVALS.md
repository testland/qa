# Skill evals

An eval runs an agent on a realistic task twice - once without the skill, once
with it - and scores the difference. It measures whether a skill changes what
the agent produces, not whether the skill reads well.

## How many per skill

**Ten.** Measured run-to-run spread on an unchanged skill is about 11 points of
100 per scenario, so a per-skill mean over n scenarios carries roughly 11/sqrt(n):

| scenarios | per-skill 95% CI | what it can do |
|---|---|---|
| 3 | +/-11 | compare the catalogue in aggregate; cannot rank one skill |
| **10** | **+/-7** | separate a skill that helps from one that does not |
| 20 | +/-5 | finer ordering, at twice the authoring cost |

Three scenarios per skill is enough to say something about a whole catalogue and
nothing about any individual member of it. Ten is the point where a per-skill
number becomes worth quoting.

## Scenarios must target what the skill uniquely supplies

The first run of this format measured 84% of criteria at their ceiling in BOTH
arms. The instrument was fine - a control skill carrying five arbitrary
conventions was adopted 5 times out of 5, every repetition. The scenarios were
the problem: they asked for competent testing, which the unaided model already
produces.

So the test for a scenario is: **what does the skill say that the model would
not otherwise do?** A specific flag, a config key whose default is wrong, an API
whose obvious usage is subtly broken, a row from the skill's anti-pattern table.
If a capable engineer would do it by reflex, it will score at ceiling in both
arms and contribute nothing but noise.

Prefer defects that are objectively detectable - a wrong pattern that makes the
suite fail, hang, or pass when it should not - so the deterministic gate decides
rather than a judge. Where the subject is judgement rather than code, plant
cases whose correct answer is to REFUSE, and mix them with determinate ones so
that neither always-guessing nor always-refusing scores well.

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

## Checking

```bash
npx tsx scripts/ts/check-scenarios.ts plugins/<plugin>/skills/<skill>   # one skill
npx tsx scripts/ts/check-all-scenarios.ts                              # every skill
```

Gates the structure the compiler and the run harness depend on: the three H2
sections, parseable FILE blocks whose paths stay inside the run directory,
criteria that parse, a `context` long enough to name a predicted failure, a
criterion heavy enough to carry the comparison, and an explicit prohibition. It
warns rather than fails when few criteria state a zero condition.

Two things it deliberately does NOT require, because both rejected sound
rubrics when it did:

- The prohibition may sit in the criterion **name** or its description, in any
  case. A rubric is not worse for writing `MUST NOT ...` as the name.
- A find-all-N audit may spread weight across its findings instead of having one
  dominant criterion. Two heavy criteria that jointly carry the comparison are
  accepted.

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
