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

## Step 4 — Build evaluations FIRST (v4.0 — Anthropic-required)

**This step is NEW in v4.0 and reorders the rest of the workflow.**

Per Anthropic's `agent-skills/best-practices` §"Build evaluations first":
*"Create evaluations BEFORE writing extensive documentation. This ensures
your Skill solves real problems rather than documenting imagined ones."*

The v4.0 rating framework formalizes this. Before drafting any body content
(Step 6), build ≥3 evals that exercise the gap this component is meant to
fill:

1. **Identify the gap.** Run Claude on representative tasks WITHOUT the new
   component. Document specific failures or missing context.
2. **Create 3 evals.** Each encodes one of those failures with an explicit
   pass condition (concrete string-match or behavioral check, not "looks
   reasonable").
3. **Include at least one adversarial / refuse-to-proceed eval** — a case
   where the component SHOULD refuse (out-of-scope input, missing
   prerequisite, ambiguous spec).
4. **Establish baseline.** Measure Claude's performance against the evals
   WITHOUT the body content. The evals are the spec the body is written
   against — if Claude can already pass them without help, the component
   isn't earning its keep.
5. **Then proceed to Step 5** (fetch canonical sources) and Step 6 (draft
   body content) with the evals as the target.

Eval file location and shape are documented under §"Authoring evaluations
for an agent (D7)" further down — that section describes WHERE evals live
and HOW they're structured; this Step 4 describes WHEN to write them
(first, not last).

**Why this order matters.** Components authored "body first, evals last"
tend to document imagined problems rather than real ones. Tier 4 surfaced
this pattern: several agents shipped bodies that listed 4-5 framework
options with no clear default — a D8 sub-check 3 failure that better evals
would have caught at authoring time.

## Step 5 — Fetch canonical sources

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

## Step 6 — Draft body content from fetched sources

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

## Prose style

These conventions keep component content (skills, agents, READMEs) readable
both in the terminal and on the published marketplace site. `validate.sh`
emits **advisory `WARN` lines** for the two rules below — they never block a
merge, but reviewers should resolve them.

### No em / en dashes in prose

Do not use `—` (em dash) or `–` (en dash) in body prose, descriptions, or
table cells. They read as ornamental and are a common machine-generated
tell. Prefer rewriting:

- a colon when introducing a clarification or list,
- a period and a new sentence when the clause stands alone,
- a comma for a softer pause,
- parentheses for a true aside.

When a separator genuinely reads best, fall back to a **hyphen with spaces**
(` - `): the only dash form permitted in prose. Hyphens inside compound
words (`end-to-end`, `flaky-test`, `30-minute`) are word-joiners, not dashes,
and stay as-is. Dashes **inside code fences and inline code are left alone**:
they are part of the code, regex, CLI examples, or expected output.

### Inline code is for literal tokens, not prose

Backticks mark a literal token the reader could type or grep: an identifier,
command, flag, file path, config key, or error code. Do not wrap a whole
guidance sentence in backticks.

```text
Bad:   halt with `UNRECOGNISED_ROLE — supply a role from the recognised list`.
Good:  halt with `UNRECOGNISED_ROLE`: supply a role from the recognised list.
```

Multi-statement code belongs in a fenced block with a language tag, not in an
inline span:

```text
Bad:   the agent emits `test('x', async () => { await page.goto('/'); ... })`.
Good:  the agent emits:

       ​```ts
       test('x', async () => { await page.goto('/'); ... });
       ​```
```

A single long token (a CLI command, a method signature, a test name) is a
correct inline-code use even when it is long — leave it.

## Step 7 — Self-rate (v4.0 — 8 dimensions, 0-40 scale)

Score each of D1–D8 (0–5 per dimension):

- **D1 Spec compliance** — frontmatter follows Anthropic's plugin spec.
  Name format, name matches parent dir, description ≤1024 chars, no XML tags,
  folder + body placement correct.
- **D2 Scope quality** — archetype fit (S1–S4 / A1–A4); body length within
  the v3.0 / v4.0 archetype band; progressive disclosure when approaching
  the band cap (not splitting the skill).
- **D3 Description quality** — single-description test passes; for agents,
  description includes a "Use when…" / "Use proactively" / "Use immediately
  after…" trigger clause; skill names prefer gerund form.
- **D4 Use-case fit** — real triggers; differentiated from neighbors
  (Anthropic-bundled patterns set the bar, not aggregator-clone saturation).
- **D5 Body quality** — actionable instructions (credit checklist patterns
  + feedback loops); examples or expected output; progressive-disclosure
  layout; body length within archetype band; body hygiene (no broken refs,
  contradictions, marketing filler, time-sensitive language, Windows-style
  paths in cited examples). For A1/A3 agents ≥120 lines: explicit
  `## Output format` section.
- **D6 Terminology compliance** — ISTQB-canonical terms cited to canonical
  source; tool-specific claims grounded in fetched docs. **D6 = 0 is a
  hard reject.**
- **D7 Evaluation coverage** — ≥3 evals (built FIRST per Step 4),
  multi-model targets, ≥1 adversarial, concrete pass conditions.
  **D7 = 0 is a hard reject.**
- **D8 Best-practices adherence** (NEW in v4.0) — five sub-checks against
  Anthropic's `agent-skills/best-practices` doc:
  1. **Concision** — no over-explanation of concepts Claude already knows
  2. **Degrees-of-freedom calibration** — specificity matches task fragility
     (low freedom for fragile operations, high freedom for heuristic work)
  3. **Single-default discipline** — one primary recommendation;
     alternatives are escape hatches, not ties
  4. **Workflow + feedback-loop literacy** — explicit checklists for
     multi-step content; validator → fix → repeat patterns
  5. **Path + script + MCP hygiene** — forward slashes only in cited
     paths; scripts solve rather than punt to Claude; MCP refs use
     fully-qualified `ServerName:tool_name`. N/A defaults to PASS if the
     component bundles no scripts, references no MCP tools, and cites no
     paths.

  **D8 ≥ 1 becomes a hard reject after 2026-07-01.** During the shadow
  window (now through 2026-07-01), D8 is advisory.

**v4.0 importable bar: total ≥28 of 40.** Grade bands: A 34–40,
B 28–33, C 20–27.

**Shadow-window note:** the lint script `rating-check.sh` currently
enforces v2.0 thresholds (`rating ≥21 of 30 + d6 ≥1`). Score honestly
against v4.0 anyway — the v4.0 score informs the marketplace-wide
backfill priority list (per the framework's §10).

## Step 8 — Stamp frontmatter

Add to component frontmatter:

```yaml
rating: 24      # D1+D2+D3+D4+D5+D6 sum (script enforces 21..30)
d6: 4           # D6 sub-score (hard floor ≥1)
d7: 4           # D7 sub-score (v3.0+; hard floor ≥1 after 2026-06-01)
d8: 4           # D8 sub-score (v4.0+; advisory, hard floor ≥1 after 2026-07-01)
archetype: S1   # the matching archetype
```

The v4.0 total is computed as `rating + d7 + d8` and reported in commit
messages, but only `rating` (in [21, 30]) and `d6` (≥1) are gated by the
lint script during the shadow window.

## Step 9 — Update plugin README

Add a row to the plugin's component table:

```markdown
| skill | dbt-testing | S1 | Author and run dbt tests with CI gates |
```

## Step 10 — Run CI locally

```bash
bash scripts/test-validate.sh
bash scripts/validate.sh
bash scripts/rating-check.sh
```

All three must pass.

## Step 11 — Commit

Commit message format includes source-fetch date and v4.0 total:

```
Add <component-name> <type> (<archetype>, rated <total_v4>/40 [d6=<n>, d7=<n>, d8=<n>]; sources fetched <YYYY-MM-DD> from <domain>)
```

Where `<total_v4>` = `rating + d7 + d8`.

Example:

```
Add k6-load-testing skill (S1, rated 35/40 [d6=5, d7=4, d8=4]; sources fetched 2026-05-25 from grafana.com/docs/k6)
```

For components scored under v3.0 (no D8 yet), use the v3.0 format:

```
Add foo-bar agent (A2, rated 30/35 [d6=4, d7=4]; sources fetched 2026-05-22 from ...)
```

## Step 12 — Release the plugin

When all components in the plugin land:

1. Bump `plugins/<name>/.claude-plugin/plugin.json` `"version"` from
   `0.1.0` to `1.0.0`.
2. Update the plugin's marketplace.json description with the final
   component count if needed.
3. Run all three CI scripts.
4. Tag: `git tag <plugin-name>-1.0.0 && git push --tags`.

## Keeping installed users up to date

Once the marketplace is public and users have added it, **a version bump is
what delivers your change to them.** Claude Code resolves a plugin's version
from the first of:

1. `version` in the plugin's `plugin.json`
2. `version` in the plugin's marketplace entry
3. the git commit SHA of the plugin source

Because every plugin here sets `version` in `plugin.json`, that value wins.
Pushing new commits **without changing it does nothing for existing users**:
Claude Code sees the same version and keeps its cached copy. So:

> **Bump `plugins/<name>/.claude-plugin/plugin.json` `version` every time you
> change anything a user receives** (skill, agent, command, hook, or README),
> not just on the first `1.0.0` release. Adding one agent to a shipped plugin
> is a release: bump the version (patch or minor, as appropriate).

Do not also set `version` in the marketplace entry. The `plugin.json` value
silently overrides it, so a stale marketplace value can mask the one you meant
to ship. Pick one place (we use `plugin.json`).

Omitting `version` entirely is the supported alternative: then every commit
SHA is a new version and users get each change automatically on refresh. That
trades away semantic versioning, so this repo keeps the pinned-version
convention above instead.

### What users run to get updates

```
/plugin marketplace update testland-qa   # refresh the catalog + new versions
/reload-plugins                          # activate newly loaded agents/skills
```

A brand-new plugin shows up in `/plugin` -> Discover after the refresh. New
agents or skills inside a plugin a user already installed arrive only when that
plugin's `version` is bumped and the user runs the two commands above.
Third-party marketplaces have auto-update **off by default**, so most users
refresh manually unless they opt in via `/plugin` -> Marketplaces -> enable
auto-update.

### Guardrail

Both `make version-check` (locally) and the `enforce-version-bump` PR workflow
(`.github/workflows/version-bump.yml`) fail when files under a plugin changed
but its `plugin.json` `version` did not. Run `make version-check` before
pushing to catch it before CI does.

## Authoring evaluations for an agent (D7)

> **When to write evals: see [Step 4](#step-4--build-evaluations-first-v40--anthropic-required) — evals are authored FIRST,
> before body content (Step 6). This section covers WHERE evals live and HOW
> they're structured; Step 4 covers WHEN to write them per Anthropic's
> evaluation-driven development workflow.**

The v3.0 rating framework introduced **D7 Evaluation Coverage** as a
merge-blocking dimension for new agents (skills are deferred per the
shadow-launch priority order). v4.0 keeps D7 unchanged and adds D8
(Best-Practices Adherence) — see [Step 7](#step-7--self-rate-v40--8-dimensions-040-scale).
Every new agent ships with ≥3 evals including ≥1 adversarial /
refuse-to-proceed case.

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
[`elv1s42k-qa-research/qa-rating-framework-2026-05-25.md`](https://github.com/elv1s42/qa-research)
§"Dimension 7 — Evaluation Coverage" for the canonical template.

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
