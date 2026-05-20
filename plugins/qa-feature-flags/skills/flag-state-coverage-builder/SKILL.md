---
name: flag-state-coverage-builder
description: "Workflow-driven skill that builds a flag-state coverage matrix from the project's flag inventory and risk register. Walks through: inventorying flags (grep for flag-evaluation calls), classifying each (boolean / multi-variant / kill-switch / experiment), choosing the coverage strategy (per-flag-isolation / pairwise / full / risk-driven per feature-flag-test-matrix-reference), generating the test matrix (PICT for pairwise; manual for risk-driven), and emitting test skeletons. Use when introducing flag-test coverage to a new codebase or when a flag-related incident exposes a coverage gap. Composes feature-flag-test-matrix-reference."
rating: 22
d6: 4
archetype: S3
---

# flag-state-coverage-builder

## Overview

Building a flag-state coverage matrix from scratch is hard
because the combinatorics explode. This skill walks through
producing a **realistic** coverage matrix — not exhaustive, but
sufficient.

The output: a coverage-matrix YAML + per-cell test skeletons +
gaps documented for follow-up.

## When to use

- New codebase adopting feature flags; no test coverage yet.
- A flag-related incident exposed a coverage gap; need to
  catch up.
- Adopting a new flag platform; existing tests need re-pointing.
- Periodic audit of flag-test coverage.

## Step 1 — Inventory flags

Grep for SDK calls:

```bash
# Generic
grep -rn 'isOn\|isEnabled\|variation\|getFeatureValue' --include='*.{ts,js,py,go,java}' .

# Per-platform
grep -rn 'launchdarkly\|ld_client' .         # LD
grep -rn 'unleash.isEnabled' .                # Unleash
grep -rn 'flagsmith.get_' .                   # Flagsmith
grep -rn 'gbClient.\|growthbook' .            # GrowthBook
```

Output: a flag inventory:

```yaml
flags:
  - name: show-new-ui
    platform: launchdarkly
    type: boolean
    found_at:
      - src/components/Header.tsx:42
      - src/pages/Dashboard.tsx:88
  - name: checkout-experiment
    platform: launchdarkly
    type: multi-variant
    variants: [control, treatment-a, treatment-b]
    found_at:
      - src/pages/Checkout.tsx:120
  # ...
```

## Step 2 — Classify each flag

| Category | Signals | Coverage need |
|---|---|---|
| **Kill-switch** | Naming: `*-kill`, `disable-*`, `emergency-*` | Test on→off toggle latency |
| **Experiment** | Multi-variant, used in analytics | Per-variant test + assignment integrity |
| **Permission-gated feature** | Used with `if(flag && user.role===...)` | Test per (flag, role) cell |
| **UI tweak** | Used in JSX/template; no business logic | Default + each variant; low risk |
| **Migration** | Naming: `use-new-*`, `migrate-to-*` | Test both paths to verify equivalence |
| **Plan / tier gating** | Used with subscription / plan check | Per (flag, plan) cell |

## Step 3 — Choose coverage strategy per category

Per
[`feature-flag-test-matrix-reference`](../feature-flag-test-matrix-reference/SKILL.md):

| Strategy | Apply to |
|---|---|
| Default-only smoke | UI tweaks (low risk) |
| Per-flag isolation | Migration flags |
| Pairwise | Permission-gated + plan-tier (interactions matter) |
| Full matrix | Kill-switches + flags with regulatory impact |
| Risk-driven | Catch-all for the rest |

## Step 4 — Generate the matrix

For pairwise: use PICT (Microsoft):

```bash
# pict.txt
flag_a: on, off
flag_b: on, off
flag_c: control, treatment-a, treatment-b
user_segment: free, paid, enterprise

pict pict.txt > matrix.tsv
```

PICT emits a pairwise-covering matrix (≤ 12 tests instead of 24
for full).

For risk-driven: combine with risk register from
[`qa-process/risk-matrix`](../../../qa-process/skills/risk-matrix/SKILL.md).
Cells with high impact + high likelihood become required tests.

## Step 5 — Emit per-cell test skeleton

For each cell of the matrix, generate a test stub:

```typescript
// tests/feature-flags/auth.test.ts
describe('auth flag matrix', () => {
  beforeEach(() => {
    td.update(td.flag('use-new-auth').booleanFlag().on(false));
  });

  test('free user, new auth off → old flow', () => {
    td.update(td.flag('use-new-auth').booleanFlag().on(false));
    expect(authFlow({ plan: 'free' })).toBe('old');
  });

  test('free user, new auth on → new flow', () => {
    td.update(td.flag('use-new-auth').booleanFlag().on(true));
    expect(authFlow({ plan: 'free' })).toBe('new');
  });

  test('paid user, new auth on → new flow', () => {
    td.update(td.flag('use-new-auth').booleanFlag().on(true));
    expect(authFlow({ plan: 'paid' })).toBe('new');
  });

  // ... per pairwise matrix
});
```

The platform-specific SDK setup comes from
[`launchdarkly-testing`](../launchdarkly-testing/SKILL.md) etc.

## Step 6 — Special category tests

Add these regardless of matrix coverage:

### Kill-switch deactivation latency

```typescript
test('kill-switch deactivation propagates within 30s', async () => {
  td.update(td.flag('emergency-disable').booleanFlag().on(false));
  expect(featureActive()).toBe(true);

  td.update(td.flag('emergency-disable').booleanFlag().on(true));
  // SDK may have polling delay; in test mode it's instant
  expect(featureActive()).toBe(false);
});
```

### Default-on-error

```typescript
test('SDK fails → default returned', async () => {
  const brokenClient = simulateSDKFailure();
  expect(brokenClient.boolVariation('any-flag', user, false)).toBe(false);
  expect(brokenClient.boolVariation('any-flag', user, true)).toBe(true);
});
```

### Sticky-assignment

```typescript
test('user assignment sticky across sessions', () => {
  const v1 = client.variation('rollout', { key: 'user-1' });
  const v2 = client.variation('rollout', { key: 'user-1' });
  expect(v1).toEqual(v2);
});
```

## Step 7 — Document coverage + gaps

Emit a coverage doc:

```markdown
# Flag-Test Coverage Matrix

## Covered cells

| Flag | Strategy | Cells | Test file |
|---|---|---|---|
| show-new-ui | per-flag isolation | 2 | tests/flags/show-new-ui.test.ts |
| checkout-experiment | pairwise (3 flags) | 9 | tests/flags/checkout-pairwise.test.ts |
| auth-migration | full matrix (2 flags × 3 plans) | 6 | tests/flags/auth.test.ts |

## Documented gaps (deliberate)

| Cell | Reason | Mitigation |
|---|---|---|
| flag-x = on AND flag-y = on AND user.segment = `internal` | Low likelihood — internal users only see flag-y in beta | Manual verify on flag-y promotion |
| theme-tweak all 3 variants × all 5 segments | UI-only; default-on-each is sufficient | None |
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Build matrix without inventory | Flags missed silently | Always grep first |
| Pairwise on truly-independent flags | Wasted tests | Identify interactions; pair-test only interacting flags |
| Full matrix on 20+ flags | 2^20 tests; infeasible | Pairwise or risk-driven |
| Don't document gaps | Future maintainers don't know | Coverage doc with gaps + reason |
| One mega-test file for all flags | Failures opaque | One file per flag (or flag-pair) |
| Skip platform-specific override-mode | Tests pass against mock; prod-SDK-specific bugs hide | Use platform's TestData/bootstrap |
| Skip kill-switch test | "It worked in dev" | Always test |
| Coverage matrix not committed / no review | Drift unnoticed | Matrix.yaml in repo |

## Output

This skill produces:

- A flag inventory (Step 1).
- A coverage matrix (Step 4) committed as `flag-coverage.yaml`.
- Per-cell test skeletons (Step 5).
- Special-category tests (Step 6).
- A coverage doc with explicit gaps (Step 7).

## References

- Flag test matrix concepts:
  [`feature-flag-test-matrix-reference`](../feature-flag-test-matrix-reference/SKILL.md).
- PICT (Microsoft pairwise tool):
  [github.com/microsoft/pict](https://github.com/microsoft/pict).
- Risk-driven coupling:
  [`qa-process/risk-matrix`](../../../qa-process/skills/risk-matrix/SKILL.md).
- Per-platform implementation:
  [`launchdarkly-testing`](../launchdarkly-testing/SKILL.md),
  [`unleash-testing`](../unleash-testing/SKILL.md),
  [`flagsmith-testing`](../flagsmith-testing/SKILL.md),
  [`growthbook-testing`](../growthbook-testing/SKILL.md).
- Stale-flag detection:
  [`stale-flag-detector`](../../agents/stale-flag-detector.md).
- Lifecycle:
  [`flag-removal-runbook-author`](../flag-removal-runbook-author/SKILL.md).
