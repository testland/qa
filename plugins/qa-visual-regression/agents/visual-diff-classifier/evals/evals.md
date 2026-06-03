---
component: visual-diff-classifier
type: agent
---

# visual-diff-classifier - evals

Companion eval cases for [`visual-diff-classifier`](../../visual-diff-classifier.md).
Three cases cover happy path / branch / adversarial: a text-truncation
regression in a non-touched component (verdict `BLOCK`), an intentional
button-styling change in a touched component (verdict `OK`), and a
"looks intentional" 47-story uniform color shift where the token name
and the hex value both changed (the documented adversarial pattern that
human reviewers rubber-stamp - verdict `REVIEW`, must NOT be `OK`). Re-run
by pasting the **Input** block as the first user message and checking
the agent's output against the **Pass condition**.

## Eval 1 - happy path - text truncation in non-touched component (BLOCK / regression)

**Input:**

```
Classify this visual regression build for the team.

Diff manifest (Playwright snapshot report):
  Snapshot: dashboard-mobile-375
  Status: failed
  Files: tests/e2e/dashboard.spec.ts-snapshots/dashboard-mobile-375-actual.png,
         dashboard-mobile-375-expected.png, dashboard-mobile-375-diff.png

Diff description (from human review of the *-diff.png):
  A sidebar navigation item that previously wrapped to 2 lines is now
  truncated with an ellipsis on the right edge. Surrounding layout is
  unchanged. The truncated item label reads "Recurring transactions"
  in both -actual and -expected, but -actual shows "Recurring transa…"
  with the ellipsis.

Paired code change (from `git diff <merge-base>..HEAD`):
  Modified files in this PR:
    src/components/UserMenu.tsx — added a wider profile-avatar button
    src/components/UserMenu.module.css — width: 48px → 64px
  NOT modified:
    src/components/Sidebar.tsx
    src/components/SidebarNavItem.tsx
    src/styles/sidebar.module.css

Build URL: https://chromatic.example.com/build/12345
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Per the regression-pattern checklist (text truncation in
a component the PR does NOT modify), the agent classifies
`dashboard-mobile-375` as `regression` with pattern `text truncation`.
Per the verdict rule "BLOCK - any `regression` row," the top-line
verdict is `BLOCK`. The Recommended action surfaces the cascade
hypothesis (UserMenu width change shifted the surrounding flex /
grid context which affected sidebar widths). The output uses the
documented output-format markdown table with Severity / Snapshot /
Category / Pattern / Paired code change? / Recommended action columns.

**Pass condition:** Output contains the literal string `BLOCK` AND
`regression` AND one of `truncation` / `truncated` (case-insensitive).
Output does NOT contain a top-line verdict of `OK` for this build.

## Eval 2 - branch - intentional touched-component change (OK / intentional)

**Input:**

```
Classify this visual regression build.

Diff manifest (Chromatic):
  Snapshot: onboarding-desktop-1280
  Status: changed
  Story: Onboarding/WelcomeStep

Diff description:
  The welcome-step heading changed from "Welcome to Acme" to
  "Welcome — let's get started" (longer text). The CTA button position
  shifted ~12px downward to accommodate the longer heading. No other
  components in the build show a diff.

Paired code change (from `git diff <merge-base>..HEAD`):
  Modified files in this PR:
    src/components/Onboarding/WelcomeStep.tsx — lines 22-45
  Diff content:
    -  <h1>Welcome to Acme</h1>
    +  <h1>Welcome — let's get started</h1>

Build URL: https://chromatic.example.com/build/12346
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** The PR's code diff explicitly modifies
`Onboarding/WelcomeStep.tsx` lines 22-45, AND the visual change (heading
text + downstream CTA shift) matches the code change in scope and
direction. The agent classifies the snapshot as `intentional`,
Recommended action: `Accept the baseline`. Per the verdict rule "OK - 
all rows `intentional`," the top-line verdict is `OK`.

**Pass condition:** Output contains the literal string `intentional` AND
`OK` (as a verdict) AND one of `Accept the baseline` / `accept`
(case-insensitive). Output does NOT contain `regression` or `BLOCK` as
a verdict for this build.

## Eval 3 - adversarial - "looks intentional" token-rename hides hex-value change (REVIEW, NOT OK)

**Input:**

```
Classify this visual regression build. The team is asking us to fast-
track approval — they say the PR title explains everything.

Diff manifest (Chromatic):
  Snapshots: Atoms/Button/Primary, Atoms/Button/Secondary,
             Atoms/Button/Danger, Molecules/Card/CallToAction,
             ... (47 stories total)
  Status: changed (all 47)

Diff description:
  Every diff shows a uniform background-color shift on button-shaped
  elements:
    -actual:   #0052aa
    -expected: #0066cc
  No other visual property changed. The diff is consistent across all
  47 stories — same hex delta, same shape, same position.

Paired code change (from `git diff <merge-base>..HEAD`):
  Modified files in this PR:
    src/styles/tokens.css
  Diff content:
    -  --color-primary: #0066cc;
    +  --color-brand-primary: #0052aa;
  (Find/replace across the codebase replaced --color-primary references
  with --color-brand-primary; no other files changed.)

PR title: "Rename --color-primary to --color-brand-primary for
consistency with the brand token namespace"
PR description: "Pure rename. No visual impact intended."
```

**Target models:** sonnet (2026-05-25), opus (2026-05-25)

**Expected:** This is the documented adversarial pattern (Example 2 in
the agent body - "the core 'adversarial' pattern - a 47-story diff is
fast for a human to rubber-stamp because the change is uniform"). The
PR title says "rename for consistency" but the hex value also changed
(`#0066cc → #0052aa` is a 20-point shift across all three channels,
not a no-op rename). Per the adversarial rule "when in doubt, lean
toward `regression`" and the worked-example output, the agent must
NOT classify as `intentional` (which would issue verdict `OK`); it
must force the question by classifying as `intentional?` with
recommended action requiring author confirmation, OR by classifying
as `regression` outright. Verdict is `REVIEW` or `BLOCK` - not `OK`.

**Pass condition:** Output does NOT contain a top-line verdict of `OK`.
Output names the value change explicitly - contains both `#0066cc`
and `#0052aa` (the actual hex pair) OR explicitly flags that the rename
and the value change are separate concerns (one of `value change` /
`value also changed` / `not just a rename` / `hex changed` /
`numeric value`). The agent must not rubber-stamp the build as an
intentional rename - that is the entire adversarial point of the eval.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks (the orchestrator
  provides the diff manifest, snapshot identity, and paired-code-change
  output that the agent's Step 1-2 would otherwise collect from
  Chromatic / Percy / Playwright). No external fixtures, no need to
  clone a sample repo.
- Pass conditions are literal-substring checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility). Eval 3 reproduces the
  agent body's own Example 2 worked case verbatim in input shape - 
  the agent's correct behavior is documented in that example.
