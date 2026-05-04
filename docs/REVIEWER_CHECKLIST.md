# Reviewer Checklist

Two-evaluator rubric for component PRs. Two independent reviewers should
land within 2 points of each other on the rating total — if divergence
exceeds 2 points on any single dimension, calibrate by walking through the
relevant exemplars in `qa-component-ratings-master-2026-04-30.md` §3.

## Pre-review smoke checks

Before scoring dimensions, confirm:

- [ ] CI is green (`validate.sh`, `rating-check.sh`, `test-validate.sh` all pass)
- [ ] Commit message includes source-fetch date and rating breakdown
- [ ] Component file is in the correct path
  (`plugins/<plugin>/skills/<name>/SKILL.md` or `plugins/<plugin>/agents/<name>.md`)
- [ ] Plugin's `README.md` component table updated with new row
- [ ] Frontmatter has `rating:`, `d6:`, `archetype:` fields

If any pre-check fails, request fixes before scoring.

## D1 — Spec compliance (0-5)

Ground: `official-requirements-2026-04-29.md`.

- [ ] YAML frontmatter parses cleanly
- [ ] `name` is kebab-case, 1-64 chars, no `claude`/`anthropic`
- [ ] `description` is <= 1024 chars
- [ ] For agents: `tools:`, `model:`, `skills:` (if present) are valid
- [ ] For agents: Bash patterns are specific (not bare `Bash`)
- [ ] For commands: `disable-model-invocation` set as needed
- [ ] Skill lives at `skills/<name>/SKILL.md` (NOT inside `.claude-plugin/`)
- [ ] Preloaded skills (in `skills:`) exist in this plugin or a documented dependency

Score: __/5

## D2 — Archetype fit (0-5)

Ground: `general-use-case-framework-2026-04-30.md` §4.

For skills (S1-S4):

- **S1 file-format/domain** — body has Authoring + Running + Parsing + CI sections
- **S2 pure reference** — body is a stable reference catalog; no execution steps
- **S3 build-an-X workflow** — body produces an artifact; has decision points
- **S4 toolkit/dispatcher** — body lists sub-tools and routes between them

For agents (A1-A4):

- **A1 read-only specialist** — body emits findings; `tools` are read-only
- **A2 action-taking task** — body produces files/changes; `tools` include Write/Edit
- **A3 adversarial critic** — body classifies/rejects; framed adversarially
- **A4 builder/scaffolder** — body generates new artifacts/structure

- [ ] Body shape matches declared archetype
- [ ] No archetype-mixing (e.g., agent that does both A1 read-only AND A2 action)

Score: __/5

## D3 — Description quality (0-5)

Single-description test:

- [ ] Distinguishable from 2-3 nearest neighbors
- [ ] Predictive of body content
- [ ] Third-person, action-oriented (no "You are.../I help...")
- [ ] No `and` joining unrelated clauses
- [ ] Concrete verbs (no "helps with", "manages", "handles")
- [ ] Includes proactive trigger condition for agents ("Use when..." / "Use proactively after...")

Score: __/5

## D4 — Use-case fit (0-5)

- [ ] Trigger condition is clear and non-overlapping with sibling components
- [ ] User can predict when to invoke (or when Claude will auto-invoke an agent)
- [ ] Doesn't duplicate functionality available in another plugin
- [ ] Sized correctly: not so narrow it's only useful once; not so broad
      that it's a "general-purpose" catch-all

Score: __/5

## D5 — Body quality (0-5)

For skills:

- [ ] Progressive disclosure — main body short; details linked to `references/`
- [ ] Concrete steps with example commands/code
- [ ] Output format documented for downstream consumers
- [ ] CI-integration section (where applicable)

For agents:

- [ ] When-invoked steps numbered and concrete
- [ ] Output format defined (table shape, JSON schema, markdown structure)
- [ ] At least 2 worked examples (typical case + edge case)
- [ ] Body 30-60 lines (per framework guidance)

Score: __/5

## D6 — Terminology compliance (0-5) — HARD REJECT IF 0

- [ ] ISTQB-canonical terms (verification, validation, defect, bug, fault, error,
      regression, smoke, sanity, acceptance, etc.) used per
      `qa-reliable-sources-2026-05-03.md` §1.2.1
- [ ] Practitioner-emergent terms (flaky test, contract test, golden file, etc.)
      attributed to industry-engineering sources, not ISTQB
- [ ] Tool-specific claims (commands, flags, config fields) grounded in
      fetched canonical source
- [ ] Source URL cited inline at point of claim, not as a "References:" appendix
- [ ] Reviewer spot-checks 2-3 claims against the cited URL — no contradiction

Score: __/5 — **0 = hard reject regardless of total**

## Total

Sum: __/30 — must be >= 21 to merge.

## Two-evaluator rule

- Two reviewers score independently.
- If totals differ by more than 2 points: walk the exemplars together, then
  re-score.
- If a single dimension score differs by more than 2 points: discuss the
  rubric line items for that dimension.

## Rejection examples

If you see any of these, request changes (don't merge):

- Generic best-practices prose not grounded in any cited source
- Tool commands reproduced from training data that drift vs. current docs
- `References:` list at bottom without inline citations
- Agent body > 80 lines (move details to a preloaded skill)
- Skill body without progressive disclosure (everything inline)
- Description that is a marketing tagline rather than a behavioral spec
- Generic role-agent name (`qa-expert`, etc.) — see `decisions.md`
- Component in a §13 NOT-GAPS slot without justification

## Calibration

When in doubt, walk through these calibration anchors:

- **A-grade exemplar (28-30/30):** Anthropic's `webapp-testing` skill —
  progressive disclosure, fetched canonical source, inline cites, exemplary D6.
- **C-grade exemplar (16-20/30):** davepoon's `setup-visual-testing` —
  scaffold-only body, no execution detail, weak D5.
- **F-grade exemplar (<16/30):** any "qa-expert" persona agent — vague
  description, no archetype fit, generic role framing.

These anchors live in `qa-component-ratings-master-2026-04-30.md` §3.
