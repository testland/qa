# testland-qa

[![validate](https://github.com/testland/qa/actions/workflows/validate.yml/badge.svg)](https://github.com/testland/qa/actions/workflows/validate.yml)
[![plugin-validate](https://github.com/testland/qa/actions/workflows/plugin-validate.yml/badge.svg)](https://github.com/testland/qa/actions/workflows/plugin-validate.yml)
[![plugins](https://img.shields.io/badge/plugins-58-blue)](#plugin-catalog)
[![components](https://img.shields.io/badge/components-357-blue)](#plugin-catalog)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![marketplace](https://img.shields.io/badge/marketplace-v4.0.0-orange)](.claude-plugin/marketplace.json)

> A rigorously curated quality-engineering plugin marketplace for Claude Code.
> 58 plugins, ~357 components, every one rating-gated before merge.

## Why testland-qa

- **6-dimension quality gate** before merge — including a hard-reject for
  uncited claims (citation theater)
- **CI-validated composition** — every agent's preloaded skills are
  reference-checked, no dangling deps
- **No persona agents, no role-soup** — explicit NOT-GAPS doctrine prevents
  scope creep and generic clones
- **Reviewer-calibrated** — two-evaluator rubric, A/C/F-grade exemplars in
  [`docs/REVIEWER_TRAINING.md`](docs/REVIEWER_TRAINING.md)

See [Quality bar](#quality-bar) and [`docs/REVIEWER_CHECKLIST.md`](docs/REVIEWER_CHECKLIST.md).

## Install

### Claude Code marketplace (recommended)

```
/plugin marketplace add testland/qa
/plugin install <plugin-name>@testland-qa
```

For example:

```
/plugin install qa-data-quality@testland-qa
```

### Direct URL

```
/plugin marketplace add https://github.com/testland/qa
```

### Manual / hermetic environments

```bash
git clone https://github.com/testland/qa ~/.claude/marketplaces/testland-qa
```

## Plugin catalog

**Foundations** — test process, environment, data, reporting, impact, roles, review

[qa-process](plugins/qa-process/) · [qa-test-environment](plugins/qa-test-environment/) · [qa-test-data](plugins/qa-test-data/) · [qa-test-reporting](plugins/qa-test-reporting/) · [qa-test-impact-analysis](plugins/qa-test-impact-analysis/) · [qa-roles](plugins/qa-roles/) · [qa-test-review](plugins/qa-test-review/)

**Functional testing** — API, BDD, E2E, mobile, contract, mutation, property-based, per-language unit-tests

[qa-api-testing](plugins/qa-api-testing/) · [qa-bdd](plugins/qa-bdd/) · [qa-web-e2e](plugins/qa-web-e2e/) · [qa-mobile-native](plugins/qa-mobile-native/) · [qa-contract-testing](plugins/qa-contract-testing/) · [qa-mutation-testing](plugins/qa-mutation-testing/) · [qa-property-based](plugins/qa-property-based/) · [qa-unit-tests-js](plugins/qa-unit-tests-js/) · [qa-unit-tests-python](plugins/qa-unit-tests-python/) · [qa-unit-tests-jvm](plugins/qa-unit-tests-jvm/) · [qa-unit-tests-net](plugins/qa-unit-tests-net/) · [qa-unit-tests-go-rust](plugins/qa-unit-tests-go-rust/)

**Quality engineering** — data quality, visual regression, accessibility, localization, charts, PDF/print, modern web

[qa-data-quality](plugins/qa-data-quality/) · [qa-visual-regression](plugins/qa-visual-regression/) · [qa-accessibility-specifics](plugins/qa-accessibility-specifics/) · [qa-localization](plugins/qa-localization/) · [qa-charts-dataviz](plugins/qa-charts-dataviz/) · [qa-pdf-print-render](plugins/qa-pdf-print-render/) · [qa-modern-web](plugins/qa-modern-web/)

**Security & compliance** — SAST, DAST, SCA, secrets, SBOM, compliance

[qa-sast](plugins/qa-sast/) · [qa-dast](plugins/qa-dast/) · [qa-sca](plugins/qa-sca/) · [qa-secrets](plugins/qa-secrets/) · [qa-sbom](plugins/qa-sbom/) · [qa-compliance](plugins/qa-compliance/)

**Operations & resilience** — flake triage, bug repro, chaos, resilience drills, shift-right/left, load

[qa-flake-triage](plugins/qa-flake-triage/) · [qa-bug-repro](plugins/qa-bug-repro/) · [qa-chaos-resilience](plugins/qa-chaos-resilience/) · [qa-resilience-drills](plugins/qa-resilience-drills/) · [qa-shift-right](plugins/qa-shift-right/) · [qa-shift-left](plugins/qa-shift-left/) · [qa-load-testing](plugins/qa-load-testing/)

**AI & specialized** — LLM eval, ML models, AI-assisted, notebooks, distributed tracing, real-time, search, saga/CQRS, concurrency, db migrations, async jobs, auth flows, notifications

[qa-llm-evaluation](plugins/qa-llm-evaluation/) · [qa-ml-models](plugins/qa-ml-models/) · [qa-ai-assisted](plugins/qa-ai-assisted/) · [qa-data-notebooks](plugins/qa-data-notebooks/) · [qa-distributed-tracing](plugins/qa-distributed-tracing/) · [qa-realtime-protocols](plugins/qa-realtime-protocols/) · [qa-search-relevance](plugins/qa-search-relevance/) · [qa-saga-cqrs](plugins/qa-saga-cqrs/) · [qa-concurrency](plugins/qa-concurrency/) · [qa-db-migrations](plugins/qa-db-migrations/) · [qa-async-jobs](plugins/qa-async-jobs/) · [qa-auth-flows](plugins/qa-auth-flows/) · [qa-notifications](plugins/qa-notifications/)

**Tooling** — IaC, CI integration, CLI tools, code quality, compatibility, manual testing

[qa-iac](plugins/qa-iac/) · [qa-ci-integration](plugins/qa-ci-integration/) · [qa-cli-tools](plugins/qa-cli-tools/) · [qa-code-quality](plugins/qa-code-quality/) · [qa-compatibility](plugins/qa-compatibility/) · [qa-manual-testing](plugins/qa-manual-testing/)

For the full list with component counts and metadata, see
[`CATALOG.md`](CATALOG.md) (auto-generated from `marketplace.json`).

## Quality bar

Every component is scored on six dimensions before merge:

| Dim | Name | Anchor |
|---|---|---|
| **D1** | Spec compliance | Lint passes; required frontmatter fields present |
| **D2** | Archetype fit | Body structure matches declared archetype (S1–S4 / A1–A4) |
| **D3** | Description quality | Distinguishes vs neighbors; predicts the body |
| **D4** | Use-case fit | Explicit trigger ("Use when…"), not a persona |
| **D5** | Body quality | Concrete steps + worked examples |
| **D6** | Terminology compliance | Concrete claims cited inline at point of use |

CI enforces **total ≥ 21/30 and d6 ≥ 1**. `d6 = 0` is a hard reject —
uncited "sounds plausible" content is the dominant failure mode the gate
prevents.

See [`docs/REVIEWER_CHECKLIST.md`](docs/REVIEWER_CHECKLIST.md) for the rubric.

## Repository layout

```
testland-qa/
  .claude-plugin/marketplace.json    # required; lists all plugins
  plugins/                           # one folder per plugin
  templates/                         # plugin / skill / agent / command scaffolds
  scripts/                           # validate, rating-check, scaffolding,
                                     # composition graph, inventory, catalog
  .github/                           # workflows, issue + PR templates,
                                     # CODE_OF_CONDUCT, SECURITY, CODEOWNERS
  docs/                              # CONTRIBUTING, PLUGIN_AUTHORING,
                                     # REVIEWER_CHECKLIST, REVIEWER_TRAINING,
                                     # COMPOSITION
  CLAUDE.md                          # Claude-native contribution guide
  CHANGELOG.md                       # release notes
  CATALOG.md                         # auto-generated plugin catalog
  Makefile                           # validate / rate / compose / catalog targets
  LICENSE                            # MIT
```

## Contributing

Read [`CLAUDE.md`](CLAUDE.md) and [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md)
before opening a PR. Use the scaffolder:

```bash
bash scripts/new-plugin.sh <plugin-name> "<one-line-description>" <primary-keyword>
```

Run validation locally before pushing:

```bash
make all   # validate + rate + compose + catalog
```

Or, without `make`:

```bash
bash scripts/validate.sh .
bash scripts/rating-check.sh .
python3 scripts/composition-graph.py
```

## License

MIT — see [`LICENSE`](LICENSE).

## Star history

[![Star History Chart](https://api.star-history.com/svg?repos=testland/qa&type=Date)](https://star-history.com/#testland/qa&Date)
