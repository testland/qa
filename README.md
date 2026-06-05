# testland-qa

[![validate](https://github.com/testland/qa/actions/workflows/validate.yml/badge.svg)](https://github.com/testland/qa/actions/workflows/validate.yml)
[![plugin-validate](https://github.com/testland/qa/actions/workflows/plugin-validate.yml/badge.svg)](https://github.com/testland/qa/actions/workflows/plugin-validate.yml)
[![plugins](https://img.shields.io/badge/plugins-77-blue)](#plugin-catalog)
[![components](https://img.shields.io/badge/components-695-blue)](#plugin-catalog)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![marketplace](https://img.shields.io/badge/marketplace-v4.0.0-orange)](.claude-plugin/marketplace.json)

> A rigorously curated quality-engineering plugin marketplace for Claude Code.
> 77 plugins, 695 components, every one rating-gated before merge.

## Why testland-qa

- **6-dimension quality rubric** (D1–D6) before merge, with a hard-reject for
  uncited claims (citation theater) via the `d6` floor
- **CI-validated composition**: every agent's preloaded skills are
  reference-checked, no dangling deps
- **Differentiation required**: every component must articulate how it
  differs from its nearest neighbors. Generic, persona-shaped scopes that
  can't name a trigger condition get sent back for reshaping
- **Reviewer-calibrated**: two-evaluator rubric, A/C/F-grade exemplars in
  [`docs/REVIEWER_TRAINING.md`](docs/REVIEWER_TRAINING.md)

See [Quality bar](#quality-bar) and [`docs/REVIEWER_CHECKLIST.md`](docs/REVIEWER_CHECKLIST.md).

## How it works

The marketplace ships three kinds of building block:

- **Plugin** — an installable bundle scoped to one QA area (e.g.
  `qa-api-testing`, `qa-load-testing`). You install only the plugins your
  stack needs.
- **Skill** — an atomic, self-contained capability inside a plugin, usually
  wrapping one tool or one technique (e.g. `great-expectations`,
  `oauth-flow-test-author`). Claude loads a skill when your request matches
  its trigger; you can also ask for it by name.
- **Agent** — a task-scoped subagent that runs one focused job (e.g.
  `schema-diff-reviewer` reviews a migration diff and returns a findings
  table). An agent may preload one or more skills to do its work.

Installed components stay dormant until a matching task comes up, so adding a
plugin doesn't add noise — it adds capability that activates on demand.

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

> **Before you install:** plugins run inside your Claude Code session and ship
> agent instructions and tool wrappers. Anthropic doesn't vet marketplace
> contents — review a plugin's components before installing it into a sensitive
> project. Every component here is rating-gated (see [Quality bar](#quality-bar)),
> but you remain in control of what runs.

## Start here

New to the marketplace? Install one or two plugins for your role rather than
everything — components activate on demand, so a focused set keeps things sharp.

| If you're a… | Try first |
|---|---|
| Manual / exploratory tester | [qa-manual-testing](plugins/qa-manual-testing/) · [qa-bdd](plugins/qa-bdd/) · [qa-bug-repro](plugins/qa-bug-repro/) |
| Test automation engineer | [qa-web-e2e](plugins/qa-web-e2e/) · [qa-api-testing](plugins/qa-api-testing/) · [qa-unit-tests-js](plugins/qa-unit-tests-js/) |
| Performance engineer | [qa-load-testing](plugins/qa-load-testing/) · [qa-chaos-resilience](plugins/qa-chaos-resilience/) |
| Security tester | [qa-sast](plugins/qa-sast/) · [qa-secrets](plugins/qa-secrets/) · [qa-dast](plugins/qa-dast/) |
| Lead / manager / head of quality | [qa-roles](plugins/qa-roles/) · [qa-test-management](plugins/qa-test-management/) · [qa-process](plugins/qa-process/) |

The full catalog is below; for versions and component counts see
[`CATALOG.md`](CATALOG.md).

## Using an installed plugin

Once a plugin is installed, its skills and agents are available to Claude
Code — invoke them by describing the task in plain language. Example with
[`qa-data-quality`](plugins/qa-data-quality/):

```
/plugin install qa-data-quality@testland-qa
```

- Ask **"add Great Expectations checks to my orders pipeline"** → the
  `great-expectations` skill scaffolds an ExpectationSuite + Checkpoint and
  wires the results into a CI gate.
- On a database change, ask **"review this migration's schema diff"** → the
  `schema-diff-reviewer` agent returns a Critical / Warning / Info findings
  table covering breaking-vs-additive changes and downstream impact.

Each plugin's `README.md` lists its skills and agents and what each one does.

## Plugin catalog

77 plugins across 7 categories. See [`CATALOG.md`](CATALOG.md) for the full
table with versions and component counts.

**Foundations** (9): test process, environment, data, reporting, impact, roles, review, management, hiring

[qa-hiring](plugins/qa-hiring/) · [qa-process](plugins/qa-process/) · [qa-roles](plugins/qa-roles/) · [qa-test-data](plugins/qa-test-data/) · [qa-test-environment](plugins/qa-test-environment/) · [qa-test-impact-analysis](plugins/qa-test-impact-analysis/) · [qa-test-management](plugins/qa-test-management/) · [qa-test-reporting](plugins/qa-test-reporting/) · [qa-test-review](plugins/qa-test-review/)

**Functional testing** (15): API, BDD, E2E, mobile, desktop, embedded, game, contract, mutation, property-based, per-language unit-tests

[qa-api-testing](plugins/qa-api-testing/) · [qa-bdd](plugins/qa-bdd/) · [qa-contract-testing](plugins/qa-contract-testing/) · [qa-desktop](plugins/qa-desktop/) · [qa-embedded](plugins/qa-embedded/) · [qa-game](plugins/qa-game/) · [qa-mobile-native](plugins/qa-mobile-native/) · [qa-mutation-testing](plugins/qa-mutation-testing/) · [qa-property-based](plugins/qa-property-based/) · [qa-unit-tests-go-rust](plugins/qa-unit-tests-go-rust/) · [qa-unit-tests-js](plugins/qa-unit-tests-js/) · [qa-unit-tests-jvm](plugins/qa-unit-tests-jvm/) · [qa-unit-tests-net](plugins/qa-unit-tests-net/) · [qa-unit-tests-python](plugins/qa-unit-tests-python/) · [qa-web-e2e](plugins/qa-web-e2e/)

**Quality engineering** (9): data quality, visual regression, accessibility, localization, charts, PDF/print, modern web, browser extension, PWA

[qa-accessibility-specifics](plugins/qa-accessibility-specifics/) · [qa-browser-extension](plugins/qa-browser-extension/) · [qa-charts-dataviz](plugins/qa-charts-dataviz/) · [qa-data-quality](plugins/qa-data-quality/) · [qa-localization](plugins/qa-localization/) · [qa-modern-web](plugins/qa-modern-web/) · [qa-pdf-print-render](plugins/qa-pdf-print-render/) · [qa-pwa](plugins/qa-pwa/) · [qa-visual-regression](plugins/qa-visual-regression/)

**Security & compliance** (9): SAST, DAST, SCA, secrets, SBOM, fuzz, compliance, multi-tenancy isolation, test-data privacy

[qa-compliance](plugins/qa-compliance/) · [qa-dast](plugins/qa-dast/) · [qa-fuzz-testing](plugins/qa-fuzz-testing/) · [qa-multi-tenancy](plugins/qa-multi-tenancy/) · [qa-sast](plugins/qa-sast/) · [qa-sbom](plugins/qa-sbom/) · [qa-sca](plugins/qa-sca/) · [qa-secrets](plugins/qa-secrets/) · [qa-test-data-privacy](plugins/qa-test-data-privacy/)

**Operations & resilience** (8): flake triage, bug repro, defect management, chaos, resilience drills, shift-right/left, load

[qa-bug-repro](plugins/qa-bug-repro/) · [qa-chaos-resilience](plugins/qa-chaos-resilience/) · [qa-defect-management](plugins/qa-defect-management/) · [qa-flake-triage](plugins/qa-flake-triage/) · [qa-load-testing](plugins/qa-load-testing/) · [qa-resilience-drills](plugins/qa-resilience-drills/) · [qa-shift-left](plugins/qa-shift-left/) · [qa-shift-right](plugins/qa-shift-right/)

**AI & specialized** (21): LLM eval, ML models, AI-assisted, notebooks, distributed tracing, real-time protocols, search, saga/CQRS, concurrency, db migrations, async jobs, auth flows, notifications, cache, experimentation, feature flags, GraphQL, gRPC, payment, serverless, time/timezones

[qa-ai-assisted](plugins/qa-ai-assisted/) · [qa-async-jobs](plugins/qa-async-jobs/) · [qa-auth-flows](plugins/qa-auth-flows/) · [qa-cache-testing](plugins/qa-cache-testing/) · [qa-concurrency](plugins/qa-concurrency/) · [qa-data-notebooks](plugins/qa-data-notebooks/) · [qa-db-migrations](plugins/qa-db-migrations/) · [qa-distributed-tracing](plugins/qa-distributed-tracing/) · [qa-experimentation](plugins/qa-experimentation/) · [qa-feature-flags](plugins/qa-feature-flags/) · [qa-graphql](plugins/qa-graphql/) · [qa-grpc](plugins/qa-grpc/) · [qa-llm-evaluation](plugins/qa-llm-evaluation/) · [qa-ml-models](plugins/qa-ml-models/) · [qa-notifications](plugins/qa-notifications/) · [qa-payment](plugins/qa-payment/) · [qa-realtime-protocols](plugins/qa-realtime-protocols/) · [qa-saga-cqrs](plugins/qa-saga-cqrs/) · [qa-search-relevance](plugins/qa-search-relevance/) · [qa-serverless](plugins/qa-serverless/) · [qa-time-and-timezones](plugins/qa-time-and-timezones/)

**Tooling** (6): IaC, CI integration, CLI tools, code quality, compatibility, manual testing

[qa-ci-integration](plugins/qa-ci-integration/) · [qa-cli-tools](plugins/qa-cli-tools/) · [qa-code-quality](plugins/qa-code-quality/) · [qa-compatibility](plugins/qa-compatibility/) · [qa-iac](plugins/qa-iac/) · [qa-manual-testing](plugins/qa-manual-testing/)

## Quality bar

Every component is scored on six dimensions before merge (the D6 rubric,
0-30 scale, merge bar 21):

| Dim | Name | Anchor |
|---|---|---|
| **D1** | Spec compliance | Lint passes; required frontmatter fields present |
| **D2** | Scope quality | One coherent scope the description predicts; single responsibility; progressive disclosure |
| **D3** | Description quality | Distinguishes vs neighbors; predicts the body |
| **D4** | Use-case fit | Explicit trigger ("Use when…"), not a persona |
| **D5** | Body quality | Concrete steps + worked examples |
| **D6** | Terminology compliance | Concrete claims cited inline at point of use |

A reviewer scores each dimension; the sum is the `rating` (0-30). CI enforces
**rating ≥ 21 and d6 ≥ 1** — `d6` surfaces the dominant "citation theater"
failure mode, so `d6 = 0` is a hard reject. Mechanical lint (naming, JSON,
description/body length, Windows-path hygiene) runs alongside in `validate.py`
and `content-audit.py`.

See [`docs/REVIEWER_CHECKLIST.md`](docs/REVIEWER_CHECKLIST.md) for the rubric
and [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) for the framework details.

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

## Questions & feedback

- **Bug or a broken component?** Open an [issue](https://github.com/testland/qa/issues/new/choose).
- **Want a plugin that doesn't exist yet?** Use the plugin-request issue template.
- **General questions or ideas?** Start a thread in
  [Discussions](https://github.com/testland/qa/discussions).
- **Security report?** See [`SECURITY.md`](.github/SECURITY.md) — don't open a
  public issue.

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

MIT. See [`LICENSE`](LICENSE).
