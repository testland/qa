# testland-qa

A Claude Code plugin marketplace covering QA gap cells in the existing
ecosystem: data quality, visual regression, contract testing, flake triage,
bug reproduction, manual testing, BDD, property-based, chaos, shift-left,
shift-right, and more. Every component scores **>=21 on the v2.0 rating
framework** (6 dimensions, including D6 terminology compliance).

The marketplace is a multi-plugin (Pattern B2) layout: each plugin is an
independent installable unit under `plugins/`, with its own `plugin.json`,
agents, skills, optional commands, and optional hooks.

## Status

**Phase 3 complete (2026-05-05); Phase 4 complete (2026-05-06);
Phase 5 in progress (2026-05-06)** — 30 v1 plugins (~217 components)
+ 5 Phase 4 plugins (~30 components: qa-llm-evaluation,
qa-db-migrations, qa-async-jobs, qa-auth-flows, qa-notifications)
shipped 1.0.0. Phase 5 (Security & Compliance per v2 master plan)
underway: 4 of 6 plugins shipped (qa-sast, qa-dast, qa-sca, qa-secrets).
Marketplace version **3.1.4**. The index below tracks per-plugin status.

## Install

```
/plugin marketplace add testland/qa
/plugin install <plugin-name>@testland-qa
```

For example:

```
/plugin install qa-data-quality@testland-qa
```

## Plugin index

| Plugin | Components | Status |
|---|---:|---|
| [qa-data-quality](plugins/qa-data-quality/) | 8 (5 skills + 3 agents) | 1.0.0 |
| [qa-visual-regression](plugins/qa-visual-regression/) | 9 (7 skills + 2 agents) | 1.0.0 |
| [qa-contract-testing](plugins/qa-contract-testing/) | 6 (5 skills + 1 agent) | 1.0.0 |
| [qa-flake-triage](plugins/qa-flake-triage/) | 7 (2 skills + 5 agents) | 1.0.0 |
| [qa-bug-repro](plugins/qa-bug-repro/) | 5 (1 skill + 4 agents) | 1.0.0 |
| [qa-shift-left](plugins/qa-shift-left/) | 7 (3 skills + 4 agents) | 1.0.0 |
| [qa-api-testing](plugins/qa-api-testing/) | 7 (7 skills + 0 agents) | 1.0.0 |
| [qa-load-testing](plugins/qa-load-testing/) | 10 (9 skills + 1 agent) | 1.0.0 |
| [qa-test-data](plugins/qa-test-data/) | 17 (16 skills + 1 agent) | 1.0.0 |
| [qa-accessibility-specifics](plugins/qa-accessibility-specifics/) | 13 (12 skills + 1 agent) | 1.0.0 |
| [qa-test-environment](plugins/qa-test-environment/) | 5 (4 skills + 1 agent) | 1.0.0 |
| [qa-test-reporting](plugins/qa-test-reporting/) | 16 (16 skills + 0 agents) | 1.0.0 |
| [qa-test-impact-analysis](plugins/qa-test-impact-analysis/) | 4 (2 skills + 2 agents) | 1.0.0 |
| [qa-roles](plugins/qa-roles/) | 3 (0 skills + 3 agents) | 1.0.0 |
| [qa-test-review](plugins/qa-test-review/) | 5 (1 skill + 4 agents) | 1.0.0 |
| [qa-manual-testing](plugins/qa-manual-testing/) | 7 (6 skills + 1 agent) | 1.0.0 |
| [qa-property-based](plugins/qa-property-based/) | 5 (5 skills + 0 agents) | 1.0.0 |
| [qa-shift-right](plugins/qa-shift-right/) | 5 (3 skills + 2 agents) | 1.0.0 |
| [qa-mobile-native](plugins/qa-mobile-native/) | 10 (10 skills + 0 agents) | 1.0.0 |
| [qa-mutation-testing](plugins/qa-mutation-testing/) | 6 (5 skills + 1 agent) | 1.0.0 |
| [qa-process](plugins/qa-process/) | 13 (9 skills + 4 agents) | 1.0.0 |
| [qa-chaos-resilience](plugins/qa-chaos-resilience/) | 6 (6 skills + 0 agents) | 1.0.0 |
| [qa-bdd](plugins/qa-bdd/) | 8 (7 skills + 1 agent) | 1.0.0 |
| [qa-localization](plugins/qa-localization/) | 4 (4 skills + 0 agents) | 1.0.0 |
| [qa-ai-assisted](plugins/qa-ai-assisted/) | 4 (3 skills + 1 agent) | 1.0.0 |
| [qa-compatibility](plugins/qa-compatibility/) | 3 (3 skills + 0 agents) | 1.0.0 |
| [qa-web-e2e](plugins/qa-web-e2e/) | 8 (6 skills + 2 agents) | 1.0.0 |
| [qa-ci-integration](plugins/qa-ci-integration/) | 5 (5 skills + 0 agents) | 1.0.0 |
| [qa-iac](plugins/qa-iac/) | 7 (5 skills + 2 agents) | 1.0.0 |
| [qa-cli-tools](plugins/qa-cli-tools/) | 3 (3 skills + 0 agents) | 1.0.0 |
| [qa-llm-evaluation](plugins/qa-llm-evaluation/) (Phase 4) | 7 (6 skills + 1 agent) | 1.0.0 |
| [qa-db-migrations](plugins/qa-db-migrations/) (Phase 4) | 5 (4 skills + 1 agent) | 1.0.0 |
| [qa-async-jobs](plugins/qa-async-jobs/) (Phase 4) | 7 (7 skills + 0 agents) | 1.0.0 |
| [qa-auth-flows](plugins/qa-auth-flows/) (Phase 4) | 5 (5 skills + 0 agents) | 1.0.0 |
| [qa-notifications](plugins/qa-notifications/) (Phase 4) | 6 (6 skills + 0 agents) | 1.0.0 |
| [qa-sast](plugins/qa-sast/) (Phase 5) | 6 (5 skills + 1 agent) | 1.0.0 |
| [qa-dast](plugins/qa-dast/) (Phase 5) | 5 (4 skills + 1 agent) | 1.0.0 |
| [qa-sca](plugins/qa-sca/) (Phase 5) | 6 (5 skills + 1 agent) | 1.0.0 |
| [qa-secrets](plugins/qa-secrets/) (Phase 5) | 4 (4 skills + 0 agents) | 1.0.0 |

## Authoring gate

Every component (skill or agent) ships with `rating:` (0-30) and `d6:` (0-5)
fields in its YAML frontmatter. CI enforces:

- `rating >= 21` (importable bar on the v2.0 30-point scale)
- `d6 >= 1` (a `d6 = 0` is a hard reject for citation theater — body claims
  not grounded in a fetched canonical source)

Plus naming and description lint rules (kebab-case, no `claude`/`anthropic`
reserved words, no `You are.../I help...` openers, no generic role-agent
names, no literal placeholder strings). See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md)
for the full rule set.

Run locally:

```bash
bash scripts/test-validate.sh   # validate.sh self-test
bash scripts/validate.sh        # lint plugins/
bash scripts/rating-check.sh    # rating + d6 gate
```

## Repository layout

```
testland-qa/
  .claude-plugin/marketplace.json    # required; lists all plugins
  plugins/                           # one folder per plugin
  templates/                         # plugin / skill / agent / command scaffolds
  scripts/                           # validate.sh, rating-check.sh, new-plugin.sh
  .github/workflows/ci.yml           # validate + rating-check + JSON syntax
  docs/                              # CONTRIBUTING, PLUGIN_AUTHORING, REVIEWER_CHECKLIST
```

## License

MIT — see [`LICENSE`](LICENSE).
