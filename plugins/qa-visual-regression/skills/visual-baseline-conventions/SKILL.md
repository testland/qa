---
name: visual-baseline-conventions
description: Reference catalog for visual regression coverage decisions — which Storybook stories or pages get baselines, how to choose breakpoints, when to mask vs adjust threshold, when to add or remove a baseline, and a decision matrix for picking among Percy / Chromatic / Playwright / Storybook test-runner. Use when designing visual coverage for a new project or auditing an existing baseline set.
rating: 24
d6: 3
archetype: S2
---

# visual-baseline-conventions

Reference catalog for **how** to design visual coverage. Pairs with the
engine-specific skills in this plugin
([`percy-visual-regression-testing`](../percy-visual-regression-testing/SKILL.md),
[`chromatic-visual-regression-testing`](../chromatic-visual-regression-testing/SKILL.md),
[`playwright-snapshots`](../playwright-snapshots/SKILL.md),
[`storybook-visual-regression-testing`](../storybook-visual-regression-testing/SKILL.md))
— those tell you the **how** of running baselines; this tells you
**which** baselines and **where**.

## Engine selection

Pick before authoring any baseline. Mixing engines is fine in a large
project — see
[`responsive-breakpoint-runner`](../responsive-breakpoint-runner/SKILL.md)
and [`visual-baseline-gate`](../visual-baseline-gate/SKILL.md) for the
mechanics of running and gating multiple engines together.

| Use case                                                     | Preferred engine | Why |
|--------------------------------------------------------------|------------------|-----|
| Design system / component library; story-driven coverage    | **Chromatic** (or Percy + `@percy/storybook`) | Story → snapshot is automatic; per-story granularity. |
| Application UI, page-driven full-flow coverage              | **Playwright snapshots** or **Percy + Playwright SDK** | Page-level pixel diffs; full-page scroll capture. |
| Already on BrowserStack; want hosted UI + cross-browser     | **Percy** | First-party BrowserStack integration; AI noise-filtering review mode. |
| Free / no SaaS dependency; OK with diff-image artifacts in CI | **Playwright snapshots** | Self-hosted; baselines committed to repo. |
| Storybook + free / self-hosted                               | **@storybook/test-runner postVisit + Playwright snapshots** | Per-story coverage with the Playwright snapshot mechanics. |

**Anti-pattern:** running both Percy and Chromatic on the same project
"to compare" — duplicate snapshot quota cost without a useful signal.
Pick one hosted engine; if you need self-hosted depth, add Playwright
snapshots alongside.

## Story / page selection — what gets a baseline?

Author baselines for **states the user actually sees** and skip
internal-only states.

| Layer                | Coverage                                                   |
|----------------------|------------------------------------------------------------|
| Atoms (Button, Input, Badge) | Each variant × each size × disabled & loading states.   |
| Molecules (Card, Modal, Toast) | Default state plus the single most common variant.     |
| Templates (page-level layouts) | Empty state, populated state, loading state, error state. |
| Pages (routes)       | Logged-out home, logged-in home, one representative app page. |
| Marketing pages      | Each above-the-fold section; below-the-fold only if it has interactive elements. |

Skip:

- Pure-prose long pages (Terms, Privacy) unless visual layout is a
  business concern.
- Internal admin tooling not seen by external users.
- Stories that exist only to satisfy `@storybook/addon-controls`
  combinatorics — the per-prop combination matrix is exponential and
  catches very few real bugs.

## Breakpoint selection — what widths?

The starter set most teams converge on:

| Breakpoint   | Width  | Rationale                                      |
|--------------|-------:|------------------------------------------------|
| Mobile       |  375 px | iPhone SE-class baseline (smallest popular).   |
| Tablet       |  768 px | iPad portrait (rarely the bottleneck but cheap to add). |
| Desktop      | 1280 px | Modal mid-range desktop / laptop.              |
| Wide-desktop | 1920 px | Full-HD; catches large-screen layout bugs.    |

Add a 1024 px breakpoint when iPad-landscape is a heavy-traffic device.
Add 320 px (Galaxy Fold inner display) only if analytics show
meaningful traffic at that width.

**Anti-pattern:** snapshotting at 12+ breakpoints "for safety". The
matrix ships every story × every breakpoint × every browser =
combinatorial blow-up; quota cost rises faster than bug discovery.

## Masking, threshold, or wait?

A snapshot can become noisy in three ways. The fix differs:

| Source of noise                                | Right tool                                     |
|------------------------------------------------|------------------------------------------------|
| Animated GIF / SVG / video                     | `freezeAnimatedImage` (Percy) or Playwright `animations: 'disabled'`. |
| Caret blink, focus rings, hover states         | `caret: 'hide'` (Playwright); avoid `:hover` in story render. |
| Live data (timestamps, counters, A/B variants)  | **Mask** the element (`mask` / `ignoreRegionSelectors`). |
| Anti-aliasing, sub-pixel font rendering        | **Threshold** — bump `maxDiffPixels` (50–200) or `threshold` (0.2 default → 0.3 max). |
| Async content that hasn't loaded               | **Wait** before snapshot (`page.waitForSelector`, `await expect(loc).toBeVisible()`). |

Order of preference: **wait → mask → threshold**. Reaching for
threshold first hides real regressions; waiting / masking surgically
removes the *known* noise without inflating tolerance.

**Anti-pattern:** `maxDiffPixels: 5000` "to make the build green". A
five-thousand-pixel tolerance hides whole component regressions; the
team eventually disables visual testing.

## When to add a baseline

- A new component / page is shipping.
- A regression escaped to production (add a baseline for that specific
  state to prevent re-occurrence).
- A redesign locked the new design system (refresh all baselines once
  in a single PR).

## When to remove a baseline

- The story / page was deleted and the baseline is now orphaned.
- The component is purely behavioral (e.g. a hidden context provider)
  and the baseline never had visual content.
- The baseline catches the same regression as another sibling baseline
  — keep the smaller-blast-radius one.

## When to update a baseline

- **Always after intentional UI changes**, in the same PR that ships
  the change. The PR review surface should include both the code diff
  and the snapshot diff; reviewers approve them together.
- **Never** as a separate "snapshot refresh" PR detached from the code
  change — the diff is uninterpretable without the corresponding code.

## Severity tiering

Most projects need only two tiers:

| Tier  | Behavior                              | Use for |
|-------|---------------------------------------|---------|
| Block | Fail CI; require explicit acceptance  | Production-shipped pages and components. |
| Warn  | Surface in the report; do not block   | Unstable areas under active redesign; new baselines during ramp-up (first 2 weeks). |

Promote warn-tier baselines to block-tier after they've been stable
for ~2 weeks of CI runs.

## Naming conventions

- Story-driven baselines: `<atomic-level>/<component>/<variant>` (e.g.
  `Atoms/Button/Primary-Disabled`).
- Page-driven baselines: route path with hyphens (`-`) replacing
  slashes; e.g. `/dashboard/billing` → `dashboard-billing`.
- Per-breakpoint suffix: `-375`, `-768`, `-1280`, `-1920`.

A baseline name that doesn't tell the reviewer **what** they're
looking at is the most common cause of "rubber-stamp" approvals. Self-
documenting names + the engine's diff UI make approvals fast.

## Common anti-patterns

| Anti-pattern                                        | Why it fails                                                        | Fix |
|-----------------------------------------------------|---------------------------------------------------------------------|-----|
| Baselines for every Storybook control combination   | Combinatorial blow-up; minimal new-bug signal                       | One baseline per business-relevant variant; skip auto-generated combos. |
| Threshold cranked above 0.3 / maxDiffPixels > 500   | Hides whole-component regressions                                   | Mask or wait instead. |
| Snapshots committed from developer laptops          | OS / font drift causes false positives in CI                        | Run baseline updates only in CI, or use the official Playwright Docker image locally. |
| One baseline per breakpoint per browser per locale  | Quota cost dominates; review fatigue                                | Cover most breakpoints in one browser; cross-browser only on top-traffic pages. |
| Updating snapshots in a "snapshot refresh" PR       | Reviewers can't tell intentional from regression                    | Always update baselines in the same PR as the UI code change. |
| `--auto-accept-changes` on PR branches              | Eliminates the entire point of visual review                        | Only `--auto-accept-changes` on `main` (post-merge); never on PRs. |
| Mixing Percy and Chromatic on the same coverage     | Two builds, two review UIs, duplicate quota                         | Pick one hosted engine; pair with Playwright for self-hosted depth. |

## When to retire visual coverage entirely

A few projects do not benefit from visual regression testing:

- **Backend services with no UI.** Obvious skip.
- **CLI tools.** Snapshot the rendered output as text instead.
- **Data-heavy admin panels with chronic dynamic data.** The masking
  surface area exceeds the asserted area; consider keyboard /
  accessibility tests as the visual proxy.

If you find yourself retiring more than ~20 % of your baselines as
"chronically flaky" — the project is in this category. Switch
strategies rather than fight the tool.
