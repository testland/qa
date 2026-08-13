# testland-qa

[![validate](https://github.com/testland/qa/actions/workflows/validate.yml/badge.svg)](https://github.com/testland/qa/actions/workflows/validate.yml)
[![plugin-validate](https://github.com/testland/qa/actions/workflows/plugin-validate.yml/badge.svg)](https://github.com/testland/qa/actions/workflows/plugin-validate.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> A rigorously curated quality-engineering plugin marketplace for Claude Code;
> its skills also install into any agent via the skills.sh CLI. Every component
> is reviewed before merge.

## Why testland-qa

- **Six-dimension quality rubric** applied at manual PR review, with a hard
  reject for uncited claims (citation theater) as the citation floor
- **CI-validated composition**: every agent's preloaded skills are
  reference-checked, no dangling deps
- **Differentiation required**: every component must articulate how it differs
  from its nearest neighbors. Generic, persona-shaped scopes that can't name a
  trigger condition get sent back for reshaping
- **Reviewer-calibrated**: two-evaluator rubric, A/C/F-grade exemplars in
  [`docs/REVIEWER_TRAINING.md`](docs/REVIEWER_TRAINING.md)

See [Quality bar](#quality-bar) and [`docs/REVIEWER_CHECKLIST.md`](docs/REVIEWER_CHECKLIST.md).

## How it works

The marketplace ships these building blocks:

- **Role bundle**: a one-command install of a whole role. `qa-starter` (the
  essentials every tester needs) plus the `qa-role-*` packs. Installing a bundle
  installs its member plugins for you. **Start here.**
- **Plugin**: an installable unit scoped to one QA area (e.g. `qa-api-testing`,
  `qa-load-testing`). Install only the plugins your stack needs.
- **Skill**: an atomic, self-contained capability inside a plugin, usually
  wrapping one tool or one technique (e.g. `great-expectations`,
  `oauth-flow-test-author`). Claude loads a skill when your request matches its
  trigger; you can also ask for it by name.
- **Agent**: a task-scoped subagent that runs one focused job (e.g.
  `schema-diff-reviewer` reviews a migration diff and returns a findings table).
  An agent may preload one or more skills to do its work.

Installed components stay dormant until a matching task comes up, so adding a
plugin doesn't add noise. It adds capability that activates on demand.

## Install

### Install a whole role in one command (recommended)

Add the marketplace once, then install a role bundle. Claude Code pulls in all of
its member plugins automatically:

```
/plugin marketplace add testland/qa
/plugin install qa-starter@testland-qa
```

`qa-starter` is the essentials every tester needs. For a stack-specific role,
install one of the `qa-role-*` bundles instead:

```
/plugin install qa-role-security@testland-qa    # AppSec / security testing
/plugin install qa-role-frontend@testland-qa    # web / UI automation
/plugin install qa-role-backend@testland-qa     # API / microservices / distributed
```

One bundle install brings in its whole member set (Claude Code lists what it
added). The role bundles are listed under [Start here](#start-here) and in
[`CATALOG.md`](CATALOG.md). Requires Claude Code v2.1.110+ (v2.1.143+ to enable
the set together).

### Install individual plugins

Prefer a narrower set? Install plugins one at a time:

```
/plugin install qa-data-quality@testland-qa
```

### Cross-agent install (skills.sh)

Not on Claude Code? Any skill installs into Cursor, Copilot, Gemini, Windsurf,
and 20+ other agents via the [skills.sh](https://skills.sh/testland/qa) CLI:

```bash
npx skills add testland/qa                              # browse and install from the repo
npx skills add testland/qa --skill <skill>              # one specific skill
npx skills add testland/qa --skill <one> --skill <two>  # several at once
```

The CLI installs **skills only**. Agents and the role bundles (`qa-starter` and
the `qa-role-*` family) need Claude Code: a bundle owns no `SKILL.md` of its
own, so `npx skills add` on one reports "No skills found".

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
> contents, so review a plugin's components before installing it into a sensitive
> project. Every component here is reviewed before merge (see
> [Quality bar](#quality-bar)), but you remain in control of what runs.

## Start here

New to the marketplace? Two ways in, depending on how much you want at once.

### Try one or two first

Install a couple of plugins for your role rather than everything. Components
activate on demand, so a focused set keeps things sharp.

| If you're a | Try first |
|---|---|
| Manual / exploratory tester | [qa-manual-testing](plugins/qa-manual-testing/) · [qa-bdd](plugins/qa-bdd/) · [qa-bug-repro](plugins/qa-bug-repro/) |
| Test automation engineer | [qa-web-e2e](plugins/qa-web-e2e/) · [qa-api-testing](plugins/qa-api-testing/) · [qa-unit-tests-js](plugins/qa-unit-tests-js/) |
| Performance engineer | [qa-load-testing](plugins/qa-load-testing/) · [qa-resilience](plugins/qa-resilience/) |
| Security tester | [qa-security-scanning](plugins/qa-security-scanning/) · [qa-iac](plugins/qa-iac/) · [qa-compliance](plugins/qa-compliance/) |
| Lead / manager / head of quality | [qa-team-management](plugins/qa-team-management/) · [qa-test-management](plugins/qa-test-management/) · [qa-process](plugins/qa-process/) |

### Or adopt a whole role at once

A **role bundle** installs a curated set for your role in a single command.
`/plugin install <bundle>@testland-qa` pulls in every member plugin. Start with
`qa-starter`, or pick a role:

| Bundle | Role |
|---|---|
| [qa-starter](plugins/qa-starter/) | Essentials every tester needs (start here) |
| [qa-role-manual-tester](plugins/qa-role-manual-tester/) | Manual tester / QA analyst |
| [qa-role-automation-engineer](plugins/qa-role-automation-engineer/) | Test automation engineer |
| [qa-role-sdet](plugins/qa-role-sdet/) | SDET (automation plus per-language unit testing) |
| [qa-role-frontend](plugins/qa-role-frontend/) | Frontend / web-app QA and UI automation |
| [qa-role-backend](plugins/qa-role-backend/) | Backend / API / distributed systems |
| [qa-role-mobile-desktop](plugins/qa-role-mobile-desktop/) | Mobile / desktop / cross-platform |
| [qa-role-security](plugins/qa-role-security/) | Application security and compliance |
| [qa-role-performance](plugins/qa-role-performance/) | Performance and reliability |
| [qa-role-ai](plugins/qa-role-ai/) | AI/ML and data-pipeline QA |
| [qa-role-leadership](plugins/qa-role-leadership/) | QA lead / manager / head of quality |

Bundles overlap where roles do (installing a plugin twice is harmless). The
per-language unit-test plugins and a few language-agnostic extras stay à la
carte; add them on top of a bundle as your stack needs.

## Using an installed plugin

Once a plugin is installed, its skills and agents are available to Claude Code.
Invoke them by describing the task in plain language. Example with
[`qa-data-quality`](plugins/qa-data-quality/):

```
/plugin install qa-data-quality@testland-qa
```

- Ask **"add Great Expectations checks to my orders pipeline"** and the
  `great-expectations` skill scaffolds an ExpectationSuite + Checkpoint and wires
  the results into a CI gate.
- On a database change, ask **"review this migration's schema diff"** and the
  `schema-diff-reviewer` agent returns a Critical / Warning / Info findings table
  covering breaking-vs-additive changes and downstream impact.

Each plugin's `README.md` lists its skills and agents and what each one does.

## Plugin catalog

Plugins are grouped into ten categories. For the full, always-current list with
per-plugin links, versions, and component counts, see [`CATALOG.md`](CATALOG.md).

- **Role bundles**: one-command role installs, each bundling a curated capability set
- **Foundations**: test process, environment, data, reporting, impact analysis, roles, test review, test management, hiring
- **Functional testing**: API, BDD, E2E, mobile, desktop, embedded, game, contract, mutation, property-based, per-language unit tests
- **Quality engineering**: data quality, visual regression, accessibility, localization, charts, PDF/print, modern web, browser extension, PWA
- **Security and compliance**: SAST, DAST, SCA, secrets, SBOM, fuzzing, compliance, multi-tenancy isolation, test-data privacy
- **Operations and resilience**: flake triage, bug repro, defect management, chaos, resilience drills, shift-left/right, load
- **Backend and distributed systems**: DB migrations, async jobs, caching, concurrency, distributed tracing, saga/CQRS, serverless, time and timezones
- **Integrations and protocols**: GraphQL, gRPC, real-time protocols, auth flows, notifications, payment, feature flags, experimentation
- **AI and ML**: LLM evaluation, ML model testing, AI-assisted test generation, data notebooks, search relevance
- **Tooling**: IaC, CI integration, CLI tools, code quality, compatibility, manual testing

## Quality bar

Every component is reviewed against six dimensions before merge (the D1-D6
rubric). This is a **manual PR review**: a reviewer applies the rubric to the
diff via the D1-D6 checklist in `.github/pull_request_template.md`.

| Dim | Name | Anchor |
|---|---|---|
| **D1** | Spec compliance | Lint passes; required frontmatter fields present |
| **D2** | Scope quality | One coherent scope the description predicts; single responsibility; progressive disclosure |
| **D3** | Description quality | Distinguishes vs neighbors; predicts the body |
| **D4** | Use-case fit | Explicit trigger ("Use when..."), not a persona |
| **D5** | Body quality | Concrete steps + worked examples |
| **D6** | Terminology compliance | Concrete claims cited inline at point of use |

The merge bar is reviewer judgment: each dimension should clear its anchor, with
**citations (D6) as the hard floor**. Uncited "citation theater" is the dominant
failure mode and a hard reject. There is no automated rating gate and no
`rating`/`d6` frontmatter; the rubric lives in the reviewer's checklist.
Mechanical lint (naming, JSON, description/body length, Windows-path hygiene)
still runs in CI via `validate.py` and `content-audit.py`.

See [`docs/REVIEWER_CHECKLIST.md`](docs/REVIEWER_CHECKLIST.md) for the rubric and
[`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) for the framework details.

## Repository layout

```
testland-qa/
  .claude-plugin/marketplace.json    # required; lists all plugins
  plugins/                           # one folder per plugin
  templates/                         # plugin / skill / agent / command scaffolds
  scripts/                           # validate, scaffolding,
                                     # composition graph, inventory, catalog
  .github/                           # workflows, issue + PR templates,
                                     # CODE_OF_CONDUCT, SECURITY, CODEOWNERS
  docs/                              # CONTRIBUTING, PLUGIN_AUTHORING,
                                     # REVIEWER_CHECKLIST, REVIEWER_TRAINING,
                                     # COMPOSITION
  CLAUDE.md                          # Claude-native contribution guide
  CHANGELOG.md                       # release notes
  CATALOG.md                         # auto-generated plugin catalog
  Makefile                           # validate / compose / catalog targets
  LICENSE                            # MIT
```

## Questions and feedback

- **Bug or a broken component?** Open an [issue](https://github.com/testland/qa/issues/new/choose).
- **Want a plugin that doesn't exist yet?** Use the plugin-request issue template.
- **General questions or ideas?** Start a thread in [Discussions](https://github.com/testland/qa/discussions).
- **Security report?** See [`SECURITY.md`](.github/SECURITY.md); don't open a public issue.

## Contributing

Read [`CLAUDE.md`](CLAUDE.md) and [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md)
before opening a PR. Use the scaffolder:

```bash
bash scripts/new-plugin.sh <plugin-name> "<one-line-description>" <primary-keyword>
```

Run validation locally before pushing:

```bash
make all   # validate + compose + catalog
```

Or, without `make`:

```bash
bash scripts/validate.sh .
python3 scripts/composition-graph.py
```

## License

MIT. See [`LICENSE`](LICENSE).
