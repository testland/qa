# Plugin Authoring Guide

Step-by-step walkthrough for authoring a new plugin in `testland-qa`.
Pairs with [`CONTRIBUTING.md`](CONTRIBUTING.md) (gate definition) and
[`REVIEWER_CHECKLIST.md`](REVIEWER_CHECKLIST.md) (reviewer rubric).

## Prerequisites

- Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for the rating gate, lint rules,
  and the differentiation requirement.
- Read the archetype definitions in the next section before drafting any
  component scope.
- Identify the 2–3 nearest existing components (in this marketplace or
  the broader ecosystem) and write down the differentiation axis on which
  the new component is distinguishable. Reviewers will check this against
  the description.

## Archetypes

Every component maps cleanly to one archetype. If a draft fits no archetype,
the scope is wrong — reshape before authoring.

### Skills (S1-S4)

- **S1 — file-format / domain skill.** Wraps a single tool, file format, or
  bounded domain. Body has Authoring + Running + Parsing-results +
  CI-integration sections. Example shape: a Playwright-snapshots skill that
  covers authoring, running, updating, and CI gating in one skill.
- **S2 — pure reference.** A stable reference catalog that the agent reads;
  no execution steps. Body is well-structured prose plus tables. Example
  shape: a flake-pattern catalog enumerating timing, ordering, shared-state,
  and locator-drift patterns with detection heuristics.
- **S3 — build-an-X workflow.** Produces an artifact through a workflow with
  decision points. Body walks the workflow end-to-end. Example shape: a
  data-quality-gate skill that gathers expectation results, computes
  pass/fail vs thresholds, and emits a go/no-go.
- **S4 — toolkit / dispatcher.** Lists sub-tools and routes between them.
  Body is a decision tree. Example shape: a responsive-breakpoint-runner
  that dispatches to Percy / Chromatic / Playwright snapshots based on the
  active toolchain.

### Agents (A1-A4)

- **A1 — read-only specialist.** Inspects state, emits findings; tools are
  read-only (`Read`, `Grep`, `Glob`, narrowly-scoped `Bash(git diff *)`).
  Body has When-invoked, Output-format, Examples.
- **A2 — action-taking task.** Produces files / changes; tools include
  `Write`, `Edit`, broader `Bash`. Composes preloaded skills via the
  `skills:` frontmatter field.
- **A3 — adversarial critic.** Classifies / rejects; framed adversarially.
  Body emits a verdict + rationale + recommended action.
- **A4 — builder / scaffolder.** Generates new artifacts or repository
  structure (templates, baseline configs, scaffolds). Body produces
  working artifacts the user can immediately commit.

Agent bodies stay 30-60 lines; reference material lives in preloaded skills,
not in the agent body.

## Step 1 — Scaffold the plugin

```bash
bash scripts/new-plugin.sh <plugin-name> "<one-line-description>" <primary-keyword>
```

The scaffolder:

- Copies `templates/plugin/` into `plugins/<plugin-name>/`.
- Substitutes placeholders in `plugin.json` and `README.md`.
- Appends a `{ name, source, description, strict: true }` entry to
  `.claude-plugin/marketplace.json` plugins[].

Verify: `bash scripts/validate.sh` must pass after scaffolding.

## Step 2 — Plan components

For each component you intend to ship, write a one-line draft of:

- Component type: `skill` or `agent`.
- Name (kebab-case, distinct vs. nearest neighbors in the ecosystem).
- Archetype: S1 / S2 / S3 / S4 (skills) or A1 / A2 / A3 / A4 (agents).
- Draft description (the single-description test goes here).

If a draft fits no archetype, the scope is wrong — reshape before authoring.

## Step 3 — Run the single-description test

For each draft description, check:

- **Distinguishable:** does this description clearly differ from 2-3 nearest
  neighbors? (Look at existing components in the matrix and gap analysis.)
- **Predictive:** would a third party correctly guess what the body does?
- **Voice:** third-person, action-oriented. Reject "You are..." and "I help...".
- **Single-clause:** no `and` joining two unrelated capabilities (that's
  two components, not one).
- **Concrete verbs:** "author + run + parse + gate" beats "helps with
  testing".

If any check fails, redraft.

## Step 4 — Fetch canonical sources

1. **WebFetch each canonical URL** for the tool/concept. Do not rely on
   training data — versions drift, commands change.
2. **Read end-to-end** before drafting any body content.
3. **Cross-reference the [ISTQB glossary](https://glossary.istqb.org/)
   first** for terminology; use vendor docs only for tool-specific behavior
   (commands, flags, config).
4. **Standard anchors:**
   - **Terminology:** ISTQB glossary V4.7.1 at
     https://glossary.istqb.org/en_US/term/<slug>.
   - **Standards:** ISO/IEC 25010, ISO/IEC/IEEE 29119, IEEE 829.
   - **Accessibility:** W3C WCAG 2.x.
   - **Security:** OWASP Top 10 / ASVS / Cheat Sheet Series.
   - **Vendor docs:** the official documentation site for each wrapped
     tool (Playwright, Cypress, k6, dbt, Pact, Great Expectations, Soda,
     etc.).
5. **Fallbacks** for non-WebFetchable sources:
   - **JS-rendered SPAs** (ISTQB glossary is the primary example): WebFetch
     returns only the SPA shell. Use Playwright via
     `mcp__playwright__browser_navigate` + `browser_evaluate` to extract
     content.
   - **Cloudflare Turnstile** (ISO standards pages, GraphQL spec, some
     blogs): the challenge does not clear in headless Playwright. Cite by
     stable ID (e.g., "ISO/IEC 25010:2023", "GraphQL October 2021 spec")
     and let readers navigate manually. Document the limitation in the
     body.
   - **404'd / hijacked sources:** if a primary source has been hijacked or
     removed, fall back to the project's GitHub README and flag the change
     in your PR description so the canonical-source list stays accurate.

## Step 5 — Draft body content from fetched sources

- **Body structure** uses progressive disclosure: a short main body that
  links to deeper material under `references/`. The main body covers the
  archetype's required sections (Authoring/Running/Parsing/CI for S1; etc.)
  with concrete steps and at least one worked example.
- **Body content** — every concrete claim about how a tool works, every
  command syntax, every config field, every threshold value, every
  assertion API — comes from the fetched canonical source.
- **Inline cite the source URL** at the point each claim is made. A reader
  should be able to verify any claim by clicking through. Sprinkled
  `References:` lists at the bottom without inline citations are an
  anti-pattern (reviewer rejects).
- If a claim cannot be supported by a fetched source, either (i) fetch
  additional sources, (ii) remove the claim, or (iii) explicitly mark it
  `[author opinion]` (rare; methodology framing only).

## Step 6 — Self-rate

Score each of D1-D6 (0-5):

- **D1 Spec compliance** — does the frontmatter follow Anthropic's official
  Claude Code plugin spec? Are `tools`, `allowed-tools`, `model`, `skills:`,
  `disable-model-invocation`, and `argument-hint` declarations valid?
- **D2 Archetype fit** — does the body match the declared archetype's shape?
- **D3 Description quality** — single-description test passes cleanly?
- **D4 Use-case fit** — is the trigger clear and non-overlapping with
  neighbors? Would a user know when to invoke it?
- **D5 Body quality** — progressive disclosure, concrete steps, examples,
  output format. Skill body has Authoring/Running/Parsing/CI sections;
  agent body has When invoked / Output format / Examples sections.
- **D6 Terminology compliance** — ISTQB-canonical terms cited to canonical
  source; tool-specific claims grounded in fetched docs. **D6 = 0 is a
  hard reject.**

Total >=21 to merge.

## Step 7 — Stamp frontmatter

Add to component frontmatter:

```yaml
rating: 24      # your D1+D2+D3+D4+D5+D6 total
d6: 4           # the D6 sub-score (extracted so reviewer can cross-check)
archetype: S1   # the matching archetype
```

## Step 8 — Update plugin README

Add a row to the plugin's component table:

```markdown
| skill | dbt-testing | S1 | Author and run dbt tests with CI gates |
```

## Step 9 — Run CI locally

```bash
bash scripts/test-validate.sh
bash scripts/validate.sh
bash scripts/rating-check.sh
```

All three must pass.

## Step 10 — Commit

Commit message format includes source-fetch date:

```
Add <component-name> <type> (<archetype>, rated <total>/30 [d6=<n>]; sources fetched <YYYY-MM-DD> from <domain>)
```

Example:

```
Add k6-load-testing skill (S1, rated 27/30 [d6=5]; sources fetched 2026-05-15 from grafana.com/docs/k6)
```

## Step 11 — Release the plugin

When all components in the plugin land:

1. Bump `plugins/<name>/.claude-plugin/plugin.json` `"version"` from
   `0.1.0` to `1.0.0`.
2. Update the plugin's marketplace.json description with the final
   component count if needed.
3. Run all three CI scripts.
4. Tag: `git tag <plugin-name>-1.0.0 && git push --tags`.

## Authoring evaluations for an agent (D7)

The v3.0 rating framework introduces **D7 Evaluation Coverage** as a
merge-blocking dimension for new agents (skills are deferred per the
shadow-launch priority order). Every new agent ships with ≥3 evals
including ≥1 adversarial / refuse-to-proceed case.

**Eval file location** — use the per-agent subdirectory layout:

```
plugins/<plugin>/agents/<agent>.md                 # the agent
plugins/<plugin>/agents/<agent>/evals/evals.md     # the eval cases
```

This sits **outside** the lint globs (`validate.sh` and
`rating-check.sh` exclude `*/agents/*/evals/*`), so eval files do not
need to carry rating frontmatter. The older sibling-file layout
(`agents/<agent>.evals.md`) is also permitted by the rating framework
but is **not recommended** in testland-qa because the lint scripts
catch it and force placeholder frontmatter.

**Eval file frontmatter** — three fields only:

```yaml
---
component: <agent-name>
type: agent
archetype: <A1 / A2 / A3 / A4>
---
```

**Eval body** — each eval has `Input:`, `Target models:` (sonnet /
haiku / opus with run-date if executed; authoring-date if only
designed), `Expected:`, and `Pass condition:` (a concrete string-match
or behavioural check, not "looks reasonable"). At least one adversarial
case per agent. See
[`elv1s42k-qa-research/qa-rating-framework-2026-05-22.md`](https://github.com/elv1s42/qa-research)
§"Eval file shape" for the canonical template.

## Reference: directory layout per plugin

```
plugins/<plugin-name>/
  .claude-plugin/plugin.json                  # required
  README.md                                    # required (component table)
  agents/<agent>.md                            # optional
  agents/<agent>/evals/evals.md                # optional; recommended for new A1-A4 agents
  skills/<skill>/SKILL.md                      # required path; SKILL.md NOT inside .claude-plugin/
  skills/<skill>/references/*.md               # optional progressive disclosure
  commands/<cmd>.md                            # optional
  hooks/hooks.json                             # optional
```

Skills MUST live at `skills/<name>/SKILL.md`. Anthropic's plugin spec
treats `.claude-plugin/` as the manifest directory only; placing a SKILL.md
inside `.claude-plugin/` will not be discovered as a skill.
