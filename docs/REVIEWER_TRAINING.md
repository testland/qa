# Reviewer Training Pack

Calibration material for the D6 rating framework (six dimensions, D1-D6). Two
reviewers should land within 2 points of each other on the same
component. This document walks three exemplars (A / C / F) with
per-dimension scoring rationale so reviewers can self-calibrate.

> The rubric is applied by **manual review of the PR diff** using the D1-D6
> checklist in [`.github/pull_request_template.md`](../.github/pull_request_template.md).
> The per-dimension scores below are the reviewer's mental model - they are
> **not** stored in component frontmatter (there are no `rating` / `d6` fields)
> and **not** enforced by CI.

## How to use this document

1. Read the [`REVIEWER_CHECKLIST.md`](REVIEWER_CHECKLIST.md) rubric first.
2. For each exemplar below, score it independently before reading the
   "Scoring rationale" block.
3. Compare your score to the documented score. If you diverge by more
   than 2 points on any single dimension, re-read the calibration
   notes for that dimension.
4. After three exemplars, two reviewers should be within 2 points on
   any new PR.

## Exemplar 1 - A-grade (24/30)

**Component:** [`plugins/qa-property-based/skills/hypothesis-testing/SKILL.md`](../plugins/qa-property-based/skills/hypothesis-testing/SKILL.md)

This is a real shipped skill. Read it now, score it, then check
against the documented scores below.

### Scoring rationale

| Dim | Score | Rationale |
|---|:---:|---|
| D1 Spec compliance | 5 | Frontmatter parses cleanly; name `hypothesis-testing` is kebab-case + non-reserved + 18 chars; description ~600 chars; body is a coherent tool/domain wrapper (Authoring + Running + Strategies + CI). Lives at correct path. |
| D2 Scope quality | 5 | One coherent scope - a tool/domain wrapper covering the full Hypothesis lifecycle: install → `@given` authoring → strategies catalog → `assume()` / `.filter()` → `@settings` config → shrinking → CI integration. Single responsibility, nothing stapled on. |
| D3 Description quality | 4 | Distinguishable from sibling PBT skills (fast-check / proptest / jqwik) by language. Predictive of body. Third-person, action-oriented. **Loses 1 point**: long description (~600 chars) packs in `@given`/`@settings`/`assume()` - reviewer-friendly but borderline against the "predictive without overload" calibration. |
| D4 Use-case fit | 4 | Trigger condition clear ("Python project needs PBT"); doesn't overlap with `fast-check-testing` etc. **Loses 1 point**: trigger predicate "input ranges / boundary values / interaction between fields" is broad; could be sharpened (e.g., "when fuzz-style coverage of one pure function is needed"). |
| D5 Body quality | 4 | Concrete commands; worked examples; CI-integration section. **Loses 1 point**: body is ~280 lines; some interior sections (composite strategies + stateful testing) could move to `references/` for true progressive disclosure. |
| D6 Terminology | 4 | ISTQB term `property-based testing` cited to glossary. Hypothesis-specific terms (`@given`, `strategies`, `shrinking`) cited inline to `hypothesis.readthedocs.io`. Spot-check: the quoted shrinking sentence appears verbatim on the cited page. **Loses 1 point**: a few `assume()` / `.filter()` claims rely on inline quotes without per-claim URL - a stricter reviewer would deduct here. |
| **Total** | **26/30** | Comfortably above the 21 merge bar; this is what "good" looks like. |

### What makes this an A-grade

- Source-grounded: every concrete claim traces to a fetched URL.
- Inline citations at point of claim, not a "References:" appendix.
- ISTQB-canonical term used correctly + cited to ISTQB.
- Tool-specific claims cited to the tool's official docs (not Stack Overflow / blog drift).
- One coherent scope; the body delivers exactly what the description predicts.
- Worked examples present.

### Common reviewer disagreement points

- D3: description-length tolerance varies. Calibration: ≤1024 chars
  passes the spec; quality is about *predictiveness*, not brevity.
- D5: lines-of-body. Calibration: skill bodies up to ~300 lines are
  fine for a full-lifecycle wrapper, under Anthropic's ~500-line ceiling.
  Beyond that, push for `references/`.

## Exemplar 2 - C-grade (18/30) synthetic

**Component:** synthetic example below - **do NOT add to the marketplace**.

```yaml
---
name: cypress-runner
description: Helps with Cypress test setup and running. Manages Cypress config and runs tests in CI.
---

# cypress-runner

## Overview

Cypress is a popular E2E testing framework. This skill helps you set
up and run Cypress tests.

## Install

```bash
npm install cypress
```

## Run

```bash
npx cypress open
npx cypress run
```

## CI

Add this to your CI workflow:

```yaml
- run: npx cypress run
```

## Best practices

- Use `data-cy` attributes for selectors.
- Don't share state between tests.
- Use `cy.intercept()` to stub network calls.
- Keep tests independent.

## References

- Cypress docs
```

### Scoring rationale

| Dim | Score | Rationale |
|---|:---:|---|
| D1 Spec compliance | 4 | Frontmatter parses; name + path correct. **Loses 1 point**: description starts with "Helps with…" - borderline against the "no helps with / handles / manages" rule (description also contains "Manages"). A strict lint would reject. |
| D2 Scope quality | 2 | Reads like a quick-start, not a coherent tool wrapper - skips Authoring entirely (no example test, no command pattern), no Parsing section, no integration with Cypress's reporter / artifact pipeline. |
| D3 Description quality | 1 | Two unrelated clauses joined with "and". Vague verbs (`Helps`, `Manages`). Not distinguishable from any other Cypress skill. Doesn't predict the body content. |
| D4 Use-case fit | 3 | Cypress is a real tool with real users; the "when to use" is implicit. **Loses 2 points**: no explicit trigger condition; overlaps directly with the (planned) `cypress-testing` skill in `qa-web-e2e`; the contributor didn't justify why this duplicate exists. |
| D5 Body quality | 4 | Concrete commands; CI snippet present. **Loses 1 point**: "Best practices" section is generic prose with no source - exactly the calibration anchor for "scaffolds tooling but doesn't walk through workflow." Worked examples missing. |
| D6 Terminology | 2 | `data-cy` selector recommendation is correct but uncited. `cy.intercept()` claim correct but no link. "References: Cypress docs" is a non-link - fails the "inline citation" rule. **0 would be a hard reject; 2 reflects partial grounding.** |
| **Total** | **18/30** | Below the 21 merge bar. Reject + request changes. |

### What makes this a C-grade

- Body is essentially a quick-start, not a workflow skill.
- Description fails the single-description test (vague verbs, joined
  clauses).
- D6 floor: claims that *could* be source-grounded aren't.
- Duplicates a planned component without justification.

### How to coach the contributor

> "Reshape this into either:
>  (a) a dispatcher skill that points users to `cypress-testing`
>      vs `playwright-testing` based on stack; or
>  (b) absorb into the existing `cypress-testing` skill in
>      qa-web-e2e (it's the canonical home).
> Either way: tighten the description (drop "helps with / manages"),
> cite Cypress docs inline at every concrete claim, and add a worked
> example or two - see hypothesis-testing for the shape."

## Exemplar 3 - F-grade (<16/30) synthetic

**Component:** synthetic example below - **do NOT add to the marketplace**.

```yaml
---
name: qa-expert
description: You are an expert QA engineer. I help with all aspects of quality assurance including test planning, automation, manual testing, performance, security, and process improvement.
---

# qa-expert

## Persona

You are a senior QA engineer with 15+ years of experience.

## What I do

- Test planning
- Test automation
- Manual testing
- Performance testing
- Security testing
- Process improvement
- Mentoring
- Tool selection

## How to invoke

Just ask me anything QA-related.
```

### Scoring rationale

| Dim | Score | Rationale |
|---|:---:|---|
| D1 Spec compliance | 1 | Description starts with "You are…" + "I help…" - both rejected by `validate.sh`. Name `qa-expert` is kebab-case and 64-char-compliant (the lint no longer bans the literal name; the issue is in D3/D4). **Lint failures on description alone make this unmergeable.** |
| D2 Scope quality | 0 | No coherent scope - body has no when-invoked steps, no output format, no concrete task. It's a persona, not a task. |
| D3 Description quality | 0 | "You are…" + "I help with all aspects of…" + 6 unrelated clauses joined with "and". Predicts nothing - the body could be literally anything. PR doesn't name nearest neighbors or articulate a differentiation axis. |
| D4 Use-case fit | 0 | Persona-as-scope; no trigger condition; would compete with every other QA component for invocation. The differentiation requirement in [`CONTRIBUTING.md`](CONTRIBUTING.md) is not met - contributor cannot say "use this when X but not when Y." |
| D5 Body quality | 1 | Body has structure (sections), but no steps, no output format, no examples. **1 point for not being empty.** |
| D6 Terminology | 0 | Zero citations; zero source-grounded claims. **D6 = 0 is a hard reject** regardless of total. |
| **Total** | **2/30, D6 = 0** | Hard reject. No differentiation axis, no trigger, no source grounding. Don't merge. |

### What makes this an F-grade

- Persona-as-scope (`You are an expert…`) - rejected by the linter on
  description openers, and by the framework's "one agent, one specific
  task" rule (D2/D4).
- No documented differentiation axis - the PR can't say which existing
  components this replaces or extends, and the description doesn't
  predict the body.
- D6 = 0 - hard reject regardless of any other dimension.

### How to coach the contributor

> "The lint fails on the description ("You are…" / "I help…" openers
> are rejected - descriptions must be third-person, action-oriented),
> and the rating bar fails on multiple dimensions: there's no coherent
> scope, no trigger condition, no differentiation axis vs the existing
> ecosystem, and zero citations.
>
> Generic names like `qa-expert` aren't banned by name anymore, but
> they almost always come with persona-shaped scopes that fail D3/D4.
> If you have a specific QA task in mind, reshape into a sharply scoped
> component: pick ONE behavior (e.g., 'reviews a test plan against the
> DoD' → that's `quality-coach` in qa-process, already shipped) and name
> it after the behavior, not the role.
>
> Before resubmitting:
> 1. Identify your 2-3 nearest neighbors and write down the
>    differentiation axis (per [`CONTRIBUTING.md`](CONTRIBUTING.md)).
> 2. Re-run the single-description test (predictive, third-person,
>    single-clause, includes 'Use when…').
> 3. Give it one coherent scope and build the body to match
>    (per [`PLUGIN_AUTHORING.md`](PLUGIN_AUTHORING.md))."

## Calibration check after the three exemplars

If you and another reviewer disagree on a new component by more than
2 points on the same dimension, walk through these clarifications:

| Dim | Common disagreement | Calibration |
|---|---|---|
| D1 | "lint passes but description starts with 'Helps with'" | Lint is the floor, not the ceiling. Spec compliance is binary on the lint, but the *quality* judgment is in D3. Don't double-deduct in D1 for description issues. |
| D2 | "is this one coherent scope or two stapled together?" | A component should do one thing. A tool wrapper that *also* produces a custom artifact via a multi-step process is two scopes - split it. Ask: does the body do exactly what the description predicts, nothing more? |
| D3 | "description is 1024 chars, is that too long?" | 1024 is the spec ceiling. Quality is about predictiveness, not length. A 900-char description that uniquely identifies the component is better than a 200-char description that doesn't. |
| D3 | "PR doesn't name nearest neighbors" | The differentiation requirement is a hard expectation, not a nice-to-have. If the PR body and component description don't identify the 2-3 closest existing components and state the axis on which the new one differs, deduct in D3 and request an update. |
| D4 | "trigger condition is implicit in the title" | Implicit triggers cause auto-invocation collisions. The trigger should be explicit in the description ("Use when…" / "Use proactively after…"). Deduct if implicit. |
| D4 | "persona-shaped scope, but lint passes" | Persona scopes (`qa-expert`, `quality-engineer`) are no longer banned by `validate.sh`. The check now lives here: if the trigger condition doesn't pick this component over its nearest neighbors, D4 fails regardless of name. |
| D5 | "body is 350 lines, push for `references/` split?" | <300 OK for a full-lifecycle skill. 300-400 OK if the extra is examples / case studies. Beyond that (toward Anthropic's ~500-line ceiling) push for split unless the contributor argues progressive disclosure would harm comprehension. |
| D6 | "claim is correct but uncited; do I deduct?" | Yes. The framework rates *citation discipline*, not just *claim accuracy*. An uncited correct claim is still uncited. The user can't verify it without re-doing the research. |

## Exit criteria

After working through this pack:

- You should be within 2 points of the documented scores on all
  three exemplars.
- You should be able to explain why D6 = 0 is a hard reject (citation
  theater is the dominant failure mode in the ecosystem; the gate
  forces source discipline).
- You should be able to spot a persona-as-scope component (vague
  description, no trigger, no nearest-neighbor differentiation) and
  explain why it fails D3/D4 - without relying on a name denylist.

If you missed by >2 points on any exemplar, re-read the relevant
[`REVIEWER_CHECKLIST.md`](REVIEWER_CHECKLIST.md) section and the
calibration notes above.

## References

- [`REVIEWER_CHECKLIST.md`](REVIEWER_CHECKLIST.md) - the rubric.
- [`PLUGIN_AUTHORING.md`](PLUGIN_AUTHORING.md) - common component shapes + authoring guide.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) - lint rules, differentiation
  requirement.
- [`COMPOSITION.md`](COMPOSITION.md) - agent → skill preload graph
  (D1 cross-plugin dep check).
