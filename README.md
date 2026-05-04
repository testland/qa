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

Phase 0 (foundation) shipped — empty marketplace with green CI pipeline.
Plugin authoring follows the per-phase plans in the research repo.

## Install (once plugins ship)

```
/plugin marketplace add testland/qa
/plugin install <plugin-name>@testland-qa
```

For example:

```
/plugin install qa-data-quality@testland-qa
```

## Plugin index

(populated as Phase 1 plugins ship)

| Plugin | Components | Status |
|---|---:|---|
| (empty) | | |

## Authoring gate

Every component (skill or agent) ships with `rating:` (0-30) and `d6:` (0-5)
fields in its YAML frontmatter. CI enforces:

- `rating >= 21` (importable bar on the v2.0 30-point scale)
- `d6 >= 1` (a `d6 = 0` is a hard reject for citation theater — body claims
  not grounded in a fetched canonical source)

Plus naming and description lint rules from `decisions.md` (kebab-case,
no `claude`/`anthropic` reserved words, no `You are.../I help...` openers,
no generic role-agent names, no literal placeholder strings).

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

## Research

Design history, decision log, coverage matrix, gap analysis, ratings master,
reliable-sources catalog, and per-phase build plans live in the companion
research repo: <https://github.com/elv1s42k/qa-research>.

## License

MIT — see [`LICENSE`](LICENSE).
