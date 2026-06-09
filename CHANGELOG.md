# Changelog

All notable changes to this marketplace are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

The marketplace version (`metadata.version` in `.claude-plugin/marketplace.json`)
is the canonical version for this changelog. Individual plugins carry their
own `version` field in `plugins/<name>/.claude-plugin/plugin.json` and follow
their own semver track; per-plugin tags (`<plugin-name>-<version>`) record
those releases.

## [Unreleased]

### Added
- `CLAUDE.md` at repo root — Claude-native contribution conventions
- `.github/` governance bundle — `CODE_OF_CONDUCT.md`, `SECURITY.md`,
  `CODEOWNERS`, `FUNDING.yml`, `pull_request_template.md`,
  `ISSUE_TEMPLATE/{bug,plugin-request,config}`
- `.github/workflows/plugin-validate.yml` — JSON Schema validation of
  `marketplace.json` and every `plugin.json` against
  json.schemastore.org; best-effort `claude plugin validate` per plugin
- `.github/workflows/version-bump.yml` — enforces `plugin.json` version
  bump when files inside a plugin change
- `Makefile` — `validate`, `rate`, `compose`, `catalog`, `inventory`, `all`
- `scripts/generate-catalog.py` + `CATALOG.md` — auto-generated, drift-checked
  category-grouped plugin catalog
- `category` field on every plugin entry in `marketplace.json`
- README restructure — badges, "why" framing, multi-path install,
  category-grouped catalog, quality-bar table, star-history chart
- `docs/ROADMAP.md` — tiered gap analysis listing high-frequency QA
  disciplines, common gaps, and previously-excluded categories now open
  for contribution
- `presets/` — drop-in `.claude/settings.json` role bundles for 10 personas
  (frontend-web, backend-api, security, performance/resilience, data, AI/ML,
  mobile/cross-platform, leadership, manual/exploratory, polyglot-unit) that
  register the marketplace and enable a curated plugin set in one gesture,
  plus `presets/README.md`. README "Start here" gains an "adopt a whole role
  at once" path linking the bundles, so adopting a role no longer means
  running `/plugin install` once per plugin

### Changed
- Recategorized the marketplace from 7 to 9 categories: split the 21-plugin
  `ai-specialized` catch-all into `ai-ml` (5), `backend-distributed` (8), and
  `integrations-protocols` (8) so each category honestly predicts its members
  (e.g. `qa-db-migrations` is database tooling, not "AI"). The `category` values
  in `marketplace.json`, `CATEGORY_ORDER` in the catalog generator, and the
  README catalog section move together; `CATALOG.md` regenerated.
- Replaced the NOT-GAPS doctrine with a plain "Differentiation requirement"
  in `docs/CONTRIBUTING.md`. Component categories formerly listed as
  "saturated" (generic code-reviewer, security-auditor, debugger,
  test-automator, per-language testing bundles, desktop / embedded /
  game / VR testing, generic security tool wrappers, generic WCAG
  umbrella skills) are no longer blocked by category. Admission is based
  on description quality, trigger condition, documented differentiation
  axis, and the rating bar (≥21/30, d6 ≥1). The change aligns with
  Anthropic's official subagent and skill guidance (description-driven
  routing, not name-based denylists).
- Sharpened D3 (description quality) and D4 (use-case fit) in
  `docs/REVIEWER_CHECKLIST.md` to absorb the persona-as-scope check
  that previously lived in `validate.sh`.
- Re-coached F-grade exemplar in `docs/REVIEWER_TRAINING.md` so the
  rejection rationale lands on rubric dimensions rather than a name
  denylist.

### Removed
- `validate.sh` no longer rejects component names by the generic-role
  denylist (`qa-expert`, `qa-engineer`, `quality-engineer`,
  `test-automator`, `qa-lead`, `qa-specialist`, `qa-pro`, `qa-master`).
  Structural lint (kebab-case, reserved-word guard, third-person
  description, placeholder check) is unchanged.
- `scripts/test-validate.sh` — the `qa-expert` fixture is gone; the
  `persona-agent.md` fixture stays and still verifies the description-
  opener lint.
- The "NOT-GAPS — saturated cells we will not fill" table and the
  NOT-GAPS issue-template checkbox.

## [4.0.0] — 2026-05-06

### Added
- 58 plugins / ~357 components covering quality engineering across 7 domains
  (foundations, functional testing, quality engineering, security & compliance,
  operations & resilience, AI/specialized, tooling)
- 6-dimension rating framework (D1–D6) with CI-enforced ≥21/30 + d6≥1 floor
- Composition graph CI validation (agent → skill preload references)
- Reviewer training pack with A/C/F-grade calibration exemplars
- NOT-GAPS doctrine (anti-saturation policy: no persona agents,
  no role-soup, no near-clones without differentiation)
- Lint harness self-test (`scripts/test-validate.sh`)

[Unreleased]: https://github.com/testland/qa/compare/v4.0.0...HEAD
[4.0.0]: https://github.com/testland/qa/releases/tag/v4.0.0
