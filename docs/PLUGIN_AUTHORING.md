# Plugin Authoring Guide

Step-by-step walkthrough for authoring a new plugin in `testland-qa`.
Pairs with `CONTRIBUTING.md` (gate definition) and `REVIEWER_CHECKLIST.md`
(reviewer rubric).

## Prerequisites

- Read `decisions.md` (research repo) for locked-in conventions.
- Read `general-use-case-framework-2026-04-30.md` §4 for archetype definitions.
- Read `qa-rating-framework-2026-04-30.md` for the 6-dimension rubric.
- Identify the target plugin in the active phase plan (Phase 1 / 2 / 3).

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

Per `qa-reliable-sources-2026-05-03.md` §21:

1. **WebFetch each canonical URL** for the tool/concept. Do not rely on
   training data — versions drift, commands change.
2. **Read end-to-end** before drafting any body content.
3. **Cross-reference the ISTQB glossary first** for terminology; use
   vendor docs only for tool-specific behavior (commands, flags, config).
4. **Fallbacks** for non-WebFetchable sources:
   - JS-rendered SPAs (ISTQB glossary, agentskills.io): use Playwright via
     `mcp__playwright__browser_navigate` + `browser_evaluate`.
   - Cloudflare Turnstile (ISO standards pages, GraphQL spec, Dan North's
     blog): cite by stable ID and document the limitation.
   - 404'd / hijacked sources (e.g., Mountebank's `mbtest.org` redirect):
     fall back to the project's GitHub README; flag the upstream URL change
     in `qa-reliable-sources-2026-05-03.md` in the same PR.

## Step 5 — Draft body content from fetched sources

- **Body structure** mirrors the patterns from
  `qa-component-ratings-master-2026-04-30.md` §3 exemplars
  (silent-failure-hunter, differential-review, webapp-testing, TDD trio).
- **Body content** — every concrete claim about how a tool works, every
  command syntax, every config field, every threshold value, every
  assertion API — comes from the fetched canonical source.
- **Inline cite the source URL** at the point each claim is made. A reader
  should be able to verify any claim by clicking through.
- If a claim cannot be supported by a fetched source, either (i) fetch
  additional sources, (ii) remove the claim, or (iii) explicitly mark it
  `[author opinion]` (rare; methodology framing only).

## Step 6 — Self-rate

Score each of D1-D6 (0-5):

- **D1 Spec compliance** — does the frontmatter follow
  `official-requirements-2026-04-29.md`? Are tools/skills declarations valid?
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

## Reference: directory layout per plugin

```
plugins/<plugin-name>/
  .claude-plugin/plugin.json          # required
  README.md                            # required (component table)
  agents/<agent>.md                    # optional
  skills/<skill>/SKILL.md              # required path; SKILL.md NOT inside .claude-plugin/
  skills/<skill>/references/*.md       # optional progressive disclosure
  commands/<cmd>.md                    # optional
  hooks/hooks.json                     # optional
```

Skills MUST live at `skills/<name>/SKILL.md` per
`official-requirements-2026-04-29.md` §1.1 critical layout warning.
