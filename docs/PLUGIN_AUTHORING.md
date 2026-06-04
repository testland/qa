# Plugin Authoring Guide

Step-by-step walkthrough for authoring a new plugin in `testland-qa`.
Pairs with [`CONTRIBUTING.md`](CONTRIBUTING.md) (gate definition) and
[`REVIEWER_CHECKLIST.md`](REVIEWER_CHECKLIST.md) (reviewer rubric).

## Prerequisites

- Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for the rating gate, lint rules,
  and the differentiation requirement.
- Skim the common component shapes in the next section before drafting any
  component scope.
- Identify the 2–3 nearest existing components (in this marketplace or
  the broader ecosystem) and write down the differentiation axis on which
  the new component is distinguishable. Reviewers will check this against
  the description.

## Common component shapes (optional)

Most well-scoped components fall into one of the shapes below. They are a
**thinking aid for getting scope right, not a required label** — nothing in the
rating gate or CI keys on them. If a draft matches none of these cleanly, the
scope is probably wrong; reshape before authoring. (D2 scores scope
*coherence*, not box-fitting.)

### Skill shapes

- **File-format / domain skill.** Wraps a single tool, file format, or
  bounded domain. Body has Authoring + Running + Parsing-results +
  CI-integration sections. Example shape: a Playwright-snapshots skill that
  covers authoring, running, updating, and CI gating in one skill.
- **Pure reference.** A stable reference catalog that the agent reads;
  no execution steps. Body is well-structured prose plus tables. Example
  shape: a flake-pattern catalog enumerating timing, ordering, shared-state,
  and locator-drift patterns with detection heuristics.
- **Build-an-X workflow.** Produces an artifact through a workflow with
  decision points. Body walks the workflow end-to-end. Example shape: a
  data-quality-gate skill that gathers expectation results, computes
  pass/fail vs thresholds, and emits a go/no-go.
- **Toolkit / dispatcher.** Lists sub-tools and routes between them.
  Body is a decision tree. Example shape: a responsive-breakpoint-runner
  that dispatches to Percy / Chromatic / Playwright snapshots based on the
  active toolchain.

### Agent shapes

- **Read-only specialist.** Inspects state, emits findings; tools are
  read-only (`Read`, `Grep`, `Glob`, narrowly-scoped `Bash(git diff *)`).
  Body has When-invoked, Output-format, Examples.
- **Action-taking task.** Produces files / changes; tools include
  `Write`, `Edit`, broader `Bash`. Composes preloaded skills via the
  `skills:` frontmatter field.
- **Adversarial critic.** Classifies / rejects; framed adversarially.
  Body emits a verdict + rationale + recommended action.
- **Builder / scaffolder.** Generates new artifacts or repository
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
- Shape: which common shape it matches (or note that it fits none, and reshape).
- Draft description (the single-description test goes here).

If a draft matches no common shape cleanly, the scope is probably wrong — reshape before authoring.

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
  sections its shape needs (e.g. Authoring/Running/Parsing/CI for a tool
  wrapper) with concrete steps and at least one worked example.
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

## Step 6 — Self-rate (D1–D6, 0–30 scale)

Score each of D1–D6 (0–5 per dimension); the sum is the `rating`:

- **D1 Spec compliance** — frontmatter follows Anthropic's plugin spec.
  Name format, name matches parent dir, description ≤1024 chars, no XML tags,
  folder + body placement correct.
- **D2 Scope quality** — one coherent scope the description predicts; single
  responsibility (no two-things-stapled-together); progressive disclosure;
  skill body under ~500 lines (Anthropic's SKILL.md guidance), agent body kept
  brief. The common shapes above are an optional aid, not a scored label.
- **D3 Description quality** — single-description test passes; for agents,
  description includes a "Use when…" / "Use proactively" / "Use immediately
  after…" trigger clause; skill names prefer gerund form.
- **D4 Use-case fit** — real triggers; differentiated from neighbors
  (Anthropic-bundled patterns set the bar, not aggregator-clone saturation).
- **D5 Body quality** — actionable instructions (credit checklist patterns
  + feedback loops); examples or expected output; progressive-disclosure
  layout; body length proportionate to type (skill <~500 lines); body hygiene
  (no broken refs, contradictions, marketing filler, time-sensitive language,
  Windows-style paths in cited examples). For read-only or adversarial-reviewer
  agents ≥120 lines: explicit `## Output format` section.
- **D6 Terminology compliance** — ISTQB-canonical terms cited to canonical
  source; tool-specific claims grounded in fetched docs. **D6 = 0 is a
  hard reject.**

**Merge bar: `rating ≥ 21` of 30, with `d6 ≥ 1`.** Mechanical hygiene
(description / body length, Windows paths) is checked separately by
`content-audit.py`.

## Step 7 — Stamp frontmatter

Add to component frontmatter:

```yaml
rating: 24      # D1+D2+D3+D4+D5+D6 sum (script enforces 21..30)
d6: 4           # D6 sub-score (hard floor ≥1; d6=0 is a hard reject)
```

## Step 8 — Update plugin README

Add a row to the plugin's component table:

```markdown
| skill | dbt-testing | Author and run dbt tests with CI gates |
```

## Step 9 — Run CI locally

```bash
bash scripts/test-validate.sh
bash scripts/validate.sh
bash scripts/rating-check.sh
python3 scripts/content-audit.py --strict
```

All four must pass.

## Step 10 — Commit

Commit message format includes source-fetch date and rating:

```
Add <component-name> <type> (rated <rating>/30 [d6=<n>]; sources fetched <YYYY-MM-DD> from <domain>)
```

Example:

```
Add k6-load-testing skill (rated 27/30 [d6=5]; sources fetched 2026-05-25 from grafana.com/docs/k6)
```

## Step 11 — Release the plugin

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

## Reference: directory layout per plugin

```
plugins/<plugin-name>/
  .claude-plugin/plugin.json                  # required
  README.md                                    # required (component table)
  agents/<agent>.md                            # optional
  skills/<skill>/SKILL.md                      # required path; SKILL.md NOT inside .claude-plugin/
  skills/<skill>/references/*.md               # optional progressive disclosure
  commands/<cmd>.md                            # optional
  hooks/hooks.json                             # optional
```

Skills MUST live at `skills/<name>/SKILL.md`. Anthropic's plugin spec
treats `.claude-plugin/` as the manifest directory only; placing a SKILL.md
inside `.claude-plugin/` will not be discovered as a skill.
