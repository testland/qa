# Claude Code instructions — testland-qa

This is **testland-qa**, a Pattern B2 multi-plugin Claude Code marketplace.
89 plugins / 706 components (run `python3 scripts/generate-catalog.py` for the
current count — `CATALOG.md` is authoritative). Every component is
rating-gated before merge.

If you're using Claude Code to contribute to this repo, this file tells you
what conventions to follow.

## Adding a new plugin

```bash
bash scripts/new-plugin.sh <plugin-name> "<one-line-description>" <primary-keyword>
```

The scaffolder creates `plugins/<plugin-name>/` with the standard layout
(`.claude-plugin/plugin.json`, `agents/`, `skills/`, `commands/`, `hooks/`,
`README.md`) and adds the plugin entry to `.claude-plugin/marketplace.json`.

Then author the components. When all components are written, bump the
plugin's `plugin.json` `version` from `0.1.0` to `1.0.0` and run validation
(see below).

### Role-bundle plugins (one-command role installs)

A **role bundle** (`qa-starter` and the `qa-role-*` family) is a special plugin
that owns **no components** — it exists only to install a curated set of plugins
together, so a user adopts a whole role with one `/plugin install`. To author one:

- `plugins/<bundle>/.claude-plugin/plugin.json` **only** — no `skills/`, `agents/`,
  `commands/`, or `hooks/` dirs. Set `"dependencies"` to an array of **bare member
  plugin-name strings** (e.g. `["qa-sast", "qa-dast"]`) — never `{name, version}`
  objects and never `name@testland-qa`. Bare same-marketplace names resolve with no
  git tag; a version-pinned dep looks for a `{plugin}--v{version}` tag this repo
  doesn't publish and would disable the bundle.
- `plugins/<bundle>/README.md` is **prose-only**: an Install block plus a plain
  "What this installs" list. It must contain **no** component-table rows (no
  first-cell `Skill`/`Agent`, no `](skills/…)`/`](agents/…)` links) or
  `content-audit.py --strict` fails `readme_count_mismatch`.
- Register it in `marketplace.json` with `"category": "role-bundles"`, then
  regenerate + commit `CATALOG.md`.
- Bundles carry no `rating`/`d6` frontmatter and are exempt from the D1–D6 gate
  (no components to score). Bump the bundle's `plugin.json` `version` whenever you
  change its `dependencies`, or the update never reaches installed users.

## Authoring a skill or agent

See [`docs/PLUGIN_AUTHORING.md`](docs/PLUGIN_AUTHORING.md) for the common
component shapes and authoring guidance.

**Frontmatter checklist** (every SKILL.md or agent.md):

| Field | Required | Notes |
|---|---|---|
| `name` | yes | kebab-case, matches the directory / filename |
| `description` | yes | third-person, no "You are…" / "I help…" openers |
| `rating` | yes | integer 0–30; CI rejects below 21 |
| `d6` | yes | integer 0–5; CI rejects 0 (citation theater) |
| `keywords` | optional | array of strings; flows into marketplace search |
| `tools` (agents only) | optional | tool allowlist (`Read`, `Grep`, `Bash(jq *)`, etc.) |
| `model` (agents only) | optional | `sonnet`, `opus`, `haiku` |
| `skills` (agents only) | optional | array of skill names this agent preloads |

**Body structure**: matches the component's shape. A tool/format wrapper has
Step 1 install, Step 2 first run, Step 3+ workflows, Anti-patterns, Limitations,
References. A build-an-X workflow walks the workflow end to end. An adversarial
reviewer agent has When invoked → Steps 1..N → Verdict → Refuse-to-proceed rules.

## The quality bar

Every component is scored on six dimensions before merge:

| Dim | Name | Anchor |
|---|---|---|
| **D1** | Spec compliance | Lint passes; required frontmatter fields present |
| **D2** | Scope quality | One coherent scope; single responsibility; progressive disclosure |
| **D3** | Description quality | Distinguishes vs neighbors; predicts the body |
| **D4** | Use-case fit | Explicit trigger ("Use when…"), not a persona |
| **D5** | Body quality | Concrete steps + worked examples |
| **D6** | Terminology compliance | Concrete claims cited inline at point of use |

CI enforces **total ≥ 21/30 and d6 ≥ 1**. `d6 = 0` is a hard reject — uncited
"sounds plausible" content is the dominant failure mode the gate prevents.

See [`docs/REVIEWER_CHECKLIST.md`](docs/REVIEWER_CHECKLIST.md) for the rubric
and [`docs/REVIEWER_TRAINING.md`](docs/REVIEWER_TRAINING.md) for A/C/F-grade
exemplars.

## Differentiation requirement

Components are admitted on three things: a sharp trigger condition, a
documented differentiation axis vs. the 2–3 nearest neighbors, and the
rating bar (≥21/30, d6 ≥1). No category is banned by name. The lint
rejects persona-style openers ("You are…" / "I help…"), but persona-shaped
*scopes* are caught by reviewer judgment in D3/D4 — not by a denylist.

What still fails the bar today:

- **Persona-as-scope with no trigger.** "qa-expert" / "quality-engineer"
  agents are no longer rejected by name, but they consistently fail D3
  (description predicts nothing) and D4 (no trigger condition, overlaps
  everything). Reshape into a sharp behavior-named component.
- **Multi-skill mega-bundles.** One skill per tool / one agent per task
  remains the convention. A "does everything for X language" skill
  collapses D3.
- **Documentation-only "guide" components** without concrete steps +
  commands. These fail D5 body quality.
- **Components that overlap an existing one without a documented
  differentiation axis.** The PR description must name the closest
  existing component(s) and state the axis on which the new one differs
  (tool, lifecycle stage, output shape, scope of inputs).
  Cross-ref `qa-iac` for the per-tool wrapper + adversarial-critic unifier model.

See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) for the differentiation
requirement in full, and [`docs/ROADMAP.md`](docs/ROADMAP.md) for the
current gap list and which categories the marketplace actively wants
contributions in.

## Local validation flow

Run these three before opening a PR; CI runs the same:

```bash
bash scripts/validate.sh .             # lint: kebab-case, required fields, no placeholders
bash scripts/rating-check.sh .         # rating ≥ 21 + d6 ≥ 1
python3 scripts/composition-graph.py   # agent → skill preload references valid
```

Or run all checks plus catalog regeneration in one go:

```bash
make all
```

## Where to look for examples

| Pattern | Canonical plugin |
|---|---|
| Tool wrappers + a mixed agent set | [`plugins/qa-data-quality/`](plugins/qa-data-quality/) (5 skills + 2 agents) |
| Per-tool wrappers + an adversarial-critic unifier | [`plugins/qa-iac/`](plugins/qa-iac/), [`plugins/qa-sast/`](plugins/qa-sast/) |
| Per-tool wrappers only (no agent) | [`plugins/qa-api-testing/`](plugins/qa-api-testing/), [`plugins/qa-property-based/`](plugins/qa-property-based/) |
| Adversarial-critic agent family | [`plugins/qa-test-review/`](plugins/qa-test-review/) |
| Build-an-X workflow skills | [`plugins/qa-resilience-drills/`](plugins/qa-resilience-drills/) |

## Common pitfalls

- **`agents/` placement**: lives at plugin root, **not** inside
  `.claude-plugin/`. Same for `skills/`, `commands/`, `hooks/`.
- **Missing `.gitkeep`**: empty directories (`commands/`, `hooks/`) need a
  `.gitkeep` so git tracks them; the scaffolder adds these but manual edits
  can lose them.
- **Uncited claims (d6 = 0)**: every concrete fact about how a tool works,
  every command, every flag, every threshold value must cite a fetched
  canonical source inline at the point of use — not in a trailing
  "References" block.
- **Description starts with "You are…" or "I help…"**: linted out by
  `validate.sh`. Use third-person action verbs.
- **Persona-as-scope agents**: agents must have a specific task scope, not
  a job title. "Reviews test plans against the DoD" is an agent;
  "is a QA expert" is not.
- **Reusing existing tools without differentiation**: if a similar component
  already exists in the marketplace or a peer repo, document the
  differentiation axis in the description (e.g., "per-tool wrapper +
  adversarial-critic unifier" per the qa-iac model).
