# Claude Code instructions — testland-qa

This is **testland-qa**, a Pattern B2 multi-plugin Claude Code marketplace.
58 plugins / ~357 components. Every component is rating-gated before merge.

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

## Authoring a skill or agent

See [`docs/PLUGIN_AUTHORING.md`](docs/PLUGIN_AUTHORING.md) for full archetype
guidance.

**Frontmatter checklist** (every SKILL.md or agent.md):

| Field | Required | Notes |
|---|---|---|
| `name` | yes | kebab-case, matches the directory / filename |
| `description` | yes | third-person, no "You are…" / "I help…" openers |
| `archetype` | yes | one of S1, S2, S3, S4 (skills) or A1, A2, A3, A4 (agents) |
| `rating` | yes | integer 0–30; CI rejects below 21 |
| `d6` | yes | integer 0–5; CI rejects 0 (citation theater) |
| `keywords` | optional | array of strings; flows into marketplace search |
| `tools` (agents only) | optional | tool allowlist (`Read`, `Grep`, `Bash(jq *)`, etc.) |
| `model` (agents only) | optional | `sonnet`, `opus`, `haiku` |
| `skills` (agents only) | optional | array of skill names this agent preloads |

**Body structure**: matches the declared archetype. S1 = file-format/domain
wrapper (Step 1 install, Step 2 first run, Step 3+ workflows, Anti-patterns,
Limitations, References). S3 = build-an-X workflow. A3 = adversarial reviewer
(When invoked → Steps 1..N → Verdict → Refuse-to-proceed rules).

## The quality bar

Every component is scored on six dimensions before merge:

| Dim | Name | Anchor |
|---|---|---|
| **D1** | Spec compliance | Lint passes; required frontmatter fields present |
| **D2** | Archetype fit | Body structure matches declared archetype |
| **D3** | Description quality | Distinguishes vs neighbors; predicts the body |
| **D4** | Use-case fit | Explicit trigger ("Use when…"), not a persona |
| **D5** | Body quality | Concrete steps + worked examples |
| **D6** | Terminology compliance | Concrete claims cited inline at point of use |

CI enforces **total ≥ 21/30 and d6 ≥ 1**. `d6 = 0` is a hard reject — uncited
"sounds plausible" content is the dominant failure mode the gate prevents.

See [`docs/REVIEWER_CHECKLIST.md`](docs/REVIEWER_CHECKLIST.md) for the rubric
and [`docs/REVIEWER_TRAINING.md`](docs/REVIEWER_TRAINING.md) for A/C/F-grade
exemplars.

## NOT-GAPS

Some component categories are **explicitly out of scope** because the
ecosystem is saturated and the rating gate would reject them. Do not
propose:

- Generic role-agent names: `qa-expert`, `quality-engineer`, `qa-engineer`,
  `debugger`, `architect`, `tester`. Persona-as-scope agents lose D2 (no
  task), D3 (description matches 3+ near-clones), D4 (no trigger condition).
- Multi-skill mega-bundles ("does everything for X language"). One skill
  per tool is the convention.
- Documentation-only "guide" components without concrete steps + commands.
- Components that overlap an existing one without a documented differentiation
  axis (cross-ref `qa-iac` for the per-tool S1 + A3 unifier model).

See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) for the full NOT-GAPS list.

## Local validation flow

Run these three before opening a PR; CI runs the same:

```bash
bash scripts/validate.sh .             # lint: kebab-case, required fields, no placeholders
bash scripts/rating-check.sh .         # rating ≥ 21 + d6 ≥ 1
python3 scripts/composition-graph.py   # agent → skill preload references valid
```

After P1 ships, the same is also available as `make all`.

## Where to look for examples

| Pattern | Canonical plugin |
|---|---|
| S1 wrappers + multi-archetype agent set | [`plugins/qa-data-quality/`](plugins/qa-data-quality/) (5 skills S1 + 3 agents A1/A2/A3) |
| Per-tool S1 + A3 unifier | [`plugins/qa-iac/`](plugins/qa-iac/), [`plugins/qa-sast/`](plugins/qa-sast/) |
| Per-tool S1 only (no agent) | [`plugins/qa-api-testing/`](plugins/qa-api-testing/), [`plugins/qa-property-based/`](plugins/qa-property-based/) |
| Test-only A3 family | [`plugins/qa-test-review/`](plugins/qa-test-review/) |
| Build-an-X S3 workflows | [`plugins/qa-resilience-drills/`](plugins/qa-resilience-drills/) |

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
  differentiation axis in the description (e.g., "S1 wrapper + A3 unifier"
  per the qa-iac model).
