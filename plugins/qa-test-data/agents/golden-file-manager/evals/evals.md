---
component: golden-file-manager
type: agent
archetype: A2
---

# golden-file-manager — evals

Companion eval cases for [`golden-file-manager`](../../golden-file-manager.md).
Three cases cover happy path / branch / adversarial: Jest `add` mode for a
new component snapshot, Vitest `prune` mode for orphaned snapshots, and a
refusal in `update` mode when the diff doesn't match the PR's stated intent.

Target models for re-runs: `claude-sonnet-4-6`,
`claude-haiku-4-5-20251001`, `claude-opus-4-7`. Dates recorded below are
the eval-authoring date.

## Eval 1 — happy path — `add` mode (Jest, new component snapshot)

**Input:**

```
Run in `add` mode against this React + Jest project.

Inventory:
  src/components/Modal.test.tsx       — uses toMatchSnapshot()
  src/components/Modal.tsx             — exports a deterministic component
  __snapshots__/Modal.test.tsx.snap   — missing

Project config:
  package.json scripts.test = "jest"
  jest.config.js: snapshotResolver -> default; serializers -> default
  Modal renders a static string + className only — no timestamps, UUIDs,
    Date.now(), Math.random(), or env-derived values.

Task: capture the missing baseline.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26), opus (2026-05-26)

**Expected:** Mode 1 (Add). The agent identifies the gap
(`Modal.test.tsx` has `toMatchSnapshot()` but no `.snap` file),
runs the test once (`npm test -- src/components/Modal.test.tsx`),
inspects the captured snapshot for sanitization hygiene (no
volatile values are present, so no `expect.any(...)` amendments
needed), and commits the new snapshot. The output report follows
the documented `## Golden-file maintenance` shape with
`**Mode:** add`, an Actions-taken table showing `Added: 1`, and no
"Refused updates" or sanitization-hygiene flags section.

**Pass condition:** Output contains the literal string
`**Mode:** add` AND `Added` AND `Modal.test.tsx.snap`. Output
does NOT contain `**Mode:** update` or `**Mode:** prune`.

## Eval 2 — branch — `prune` mode (orphans after feature removal)

**Input:**

```
Run in `prune` mode against this Vitest project.

Inventory (snapshot files present):
  __snapshots__/Modal.test.tsx.snap          — Modal.test.tsx exists
  __snapshots__/Button.test.tsx.snap         — Button.test.tsx exists
  __snapshots__/LegacyDrawer.test.tsx.snap   — LegacyDrawer.test.tsx DELETED in PR #4011
  __snapshots__/LegacyPicker.test.tsx.snap   — LegacyPicker.test.tsx DELETED in PR #4011

git log --diff-filter=D --summary | grep -E "Legacy(Drawer|Picker)" confirms
both files were deleted (not renamed) in commit a1b2c3d on 2026-05-10.

Project config:
  package.json scripts.test = "vitest run"
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26)

**Expected:** Mode 3 (Prune). The agent enumerates existing
`.snap` files, cross-references against current test names, and
identifies the two orphans (`LegacyDrawer.test.tsx.snap`,
`LegacyPicker.test.tsx.snap`). Per the "confirm it's not a rename
(`git log`)" rule, the `git log` evidence in the input confirms a
delete (not rename), so the agent removes both entries and deletes
the files. The output report shows `**Mode:** prune` with
`Pruned: 2` and lists both orphaned file paths.

**Pass condition:** Output contains the literal string
`**Mode:** prune` AND `Pruned` AND `LegacyDrawer` AND
`LegacyPicker`. Output does NOT contain `**Mode:** add` or
`**Mode:** update`.

## Eval 3 — adversarial — `update` mode with unrelated diff (refuse)

**Input:**

```
Run in `update` mode against this PR.

PR #5219 title:        "Refactor Modal to new color tokens"
PR #5219 description:  "Updates Modal.tsx to use the new color-token API
                        from @design-system/tokens v3. Does NOT touch
                        Footer, Header, or Sidebar."

Snapshot diffs detected by `npm test`:
  src/components/Modal.test.tsx.snap   — 4 diff hunks (Modal background +
                                         border colors changed)
  src/components/Footer.test.tsx.snap  — 1 diff hunk (Footer container
                                         className changed from
                                         "footer-light" to "footer")

Task: apply the snapshot updates per the PR's stated intent.
```

**Target models:** sonnet (2026-05-26)

**Expected:** Mode 2 (Update). The agent classifies each `.snap`
diff against the PR's stated intent. `Modal.test.tsx.snap` is
**Aligned** (matches "Refactor Modal to new color tokens"); the
agent includes it in the update and runs
`--update-snapshots` for that file. `Footer.test.tsx.snap` is
**Unrelated** (PR description explicitly says "Does NOT touch
Footer") → the agent REFUSES to update it, flags it as a likely
regression, and recommends [`regression-bisector`](../../../../qa-flake-triage/agents/regression-bisector.md).
The output report shows `Updated: 1` (Modal) and `Refused: 1`
(Footer) with a "Refused updates" section explaining the cascade.

**Pass condition:** Output contains the literal string
`Refused` AND `Footer` AND `regression-bisector`. Output also
contains `Modal` in an `Updated` row. Output does NOT show
`Footer` in any `Updated` row (the entire adversarial point is
that the agent must not auto-update the unrelated cascade).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks — no external
  fixtures, no need to clone a sample repo. The "inventory" lines and
  `git log` evidence stand in for the file-system state the agent
  would otherwise discover via its own tool calls.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- The agent's tool surface (`Read`, `Write`, `Edit`, `Grep`, `Glob`,
  narrow `Bash(git *)` / `Bash(npm test *)` / `Bash(npx vitest *)` /
  `Bash(npx jest *)` / `Bash(pytest *)`) — eval re-runs evaluate the
  text output, not file-system side effects.
- Eval cases were authored 2026-05-26 against the v3.0 / v4.0
  framework's D7 sub-checks (Evals exist, Multi-model coverage,
  Acceptance criteria, Adversarial coverage, Reproducibility).
