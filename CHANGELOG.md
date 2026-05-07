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
