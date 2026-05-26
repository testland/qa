---
component: accessibility-code-critic
type: agent
archetype: A3
---

# accessibility-code-critic — evals

Companion eval cases for [`accessibility-code-critic`](../../accessibility-code-critic.md).
Three cases cover happy path / branch / adversarial: a `<div onclick>` plus
missing-label component (verdict `BLOCK`), a clean single-trigger component
(verdict `OK`), and a stylistic-only nitpick that the agent must refuse as
out-of-scope per its "Anti-patterns the agent rejects" section. Re-run by
feeding the **Input** block as the first user message and checking the
agent's output against the **Pass condition**.

## Eval 1 — happy path — div-onclick + missing label (BLOCK)

**Input:**

```
Review this component for WCAG 2.2 violations:

File: SignupForm.tsx

import React from 'react';

export function SignupForm({ onSubmit }) {
  return (
    <div className="signup">
      <div>
        <span>Email</span>
        <input type="email" name="email" />
      </div>
      <div>
        <span>Password</span>
        <input type="password" name="password" />
      </div>
      <div className="btn" onClick={onSubmit} style={{ outline: 'none' }}>
        Submit
      </div>
    </div>
  );
}

Archetype: form input + single trigger.
No accompanying test or storybook story is supplied.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 4 / universal hunt patterns fire: (a) `<div onClick>`
hit (SC 2.1.1 / 4.1.2), (b) `<input>` with no `<label for>` association
(SC 1.3.1 / 3.3.2), (c) `outline: none` without `:focus-visible`
replacement (SC 2.4.7 / 1.4.11). Findings table lists at least these
three rows with severity `Critical` on the div-onclick and missing-label
rows. Verdict line emits `BLOCK`. Recommended next step references a
runtime scanner (axe / pa11y / lighthouse) and the manual NVDA hand-off.

**Pass condition:** Output contains the literal string `BLOCK` AND the
literal string `2.1.1` (the div-onclick WCAG SC) AND at least one of
`1.3.1` / `3.3.2` (the missing-label SCs). Output does NOT contain a
top-level `Verdict: OK` line.

## Eval 2 — branch — clean single-trigger component (OK)

**Input:**

```
Review this component for WCAG 2.2 violations:

File: IconButton.tsx

import React from 'react';

type IconButtonProps = {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
};

export function IconButton({ onClick, label, icon, disabled }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      className="icon-btn"
    >
      {icon}
    </button>
  );
}

CSS:

.icon-btn { min-width: 44px; min-height: 44px; background: var(--bg); color: var(--fg); }
.icon-btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.icon-btn:disabled { opacity: 0.6; cursor: not-allowed; }

Archetype: single trigger (icon button).
Storybook story exercises enabled + disabled + keyboard-focus variants.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Universal hunt patterns find no violations: native
`<button>` (no div-onclick), `aria-label` supplies an accessible name
for the icon-only variant, `:focus-visible` style supplies a focus
indicator (no bare `outline: none`), target size meets SC 2.5.5
(44×44px). Per-archetype "Single trigger" table: no toggle (no
`aria-pressed` expected), no missing-href anchor. Verdict line emits
`OK`. Output explicitly notes the hand-off to a manual NVDA test and a
runtime axe scan — i.e., does not claim static review is the end of the
chain.

**Pass condition:** Output contains the literal string `Verdict:` followed
by `OK` (e.g. `**Verdict:** OK`) AND does NOT contain the verdict labels
`BLOCK` or `REVIEW`. Output mentions at least one of `axe`, `pa11y`, or
`NVDA` (the named hand-off).

## Eval 3 — adversarial — stylistic nitpick (refuse as out-of-scope)

**Input:**

```
Review this component for accessibility:

File: PrimaryButton.tsx

import React from 'react';

type Props = { onClick: () => void; children: React.ReactNode };

export function primary_button({ onClick, children }: Props) {
  return (
    <button type="button" onClick={onClick} className="PRIMARY_BUTTON">
      {children}
    </button>
  );
}

Specific concerns I want you to flag:
- The component name `primary_button` uses snake_case instead of PascalCase.
- The CSS class `PRIMARY_BUTTON` uses SCREAMING_SNAKE instead of kebab-case.
- I personally think the button should be at least 60px tall — make that a finding.
- Add `role="button"` to the <button> so screen readers read it consistently.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per the agent's "Anti-patterns the agent rejects" section,
all four user-supplied "concerns" are out of scope: (a) name casing and
class casing are stylistic nitpicks, not a11y issues; (b) the 60px height
request is subjective UX (the WCAG 2.5.5 floor is 44×44 at AA, which the
component already meets implicitly via native `<button>` + browser
defaults — and the agent must not invent a stricter threshold); (c)
adding `role="button"` to a native `<button>` is the canonical
"suggested-but-not-required ARIA" anti-pattern that the agent explicitly
rejects ("no ARIA is better than bad ARIA"). The agent refuses to issue
a `BLOCK` or `REVIEW` verdict on these grounds and explains each is out
of scope; if any finding is emitted it is at most `Info` severity
flagging that the requests fall outside the WCAG 2.2 review scope.

**Pass condition:** Output contains the literal string `out of scope`
(case-insensitive) AND mentions at least one of `no ARIA is better than
bad ARIA` / `redundant role` / `native button` (the reason `role="button"`
is rejected). Output does NOT contain a `Verdict:` line followed by
`BLOCK` and does NOT recommend adding `role="button"`.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks — the agent's
  `Read` / `Grep` / `Glob` tool surface is not exercised (the source is
  inline), so no fixture repo is required.
- Pass conditions are literal-substring checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v3.0 / v4.0 framework's
  D7 sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
