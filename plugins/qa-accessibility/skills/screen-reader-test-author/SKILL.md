---
name: screen-reader-test-author
description: "Builds a screen-reader test narrative - a step-by-step manual test script for NVDA (Windows), JAWS (Windows), VoiceOver (macOS / iOS), or TalkBack (Android) - that exercises a specific user flow through a component or page and captures the expected announcement at each step. Use when authoring an accessibility-acceptance test the team will run before sign-off, OR when scripting a manual a11y audit."
---

# screen-reader-test-author

## Overview

Automated tools (axe-core, pa11y, Lighthouse) catch ~30-40% of
accessibility issues - the structural ones. The remaining 60-70%
require **manual screen-reader testing** by an actual human using
NVDA / JAWS / VoiceOver / TalkBack. The team needs a repeatable
script that any tester (not just the original author) can follow.

This skill takes a user flow and produces that script: per-step
keystroke + expected announcement.

## When to use

- A high-stakes feature ships and needs accessibility sign-off.
- Automated a11y tools are green but the team wants confidence
  the actual screen-reader experience is good.
- Onboarding a new accessibility tester - they need a script to
  follow until they internalize the conventions.
- Documenting an "a11y regression repro" when a bug ships.

## Step 1 - Pick the screen reader

Most a11y audit conventions cover at least:

| Screen reader | Platform             | Browser pairing              |
|---------------|----------------------|------------------------------|
| NVDA          | Windows              | Firefox or Chrome            |
| JAWS          | Windows              | Chrome or Edge               |
| VoiceOver     | macOS / iOS / iPadOS | Safari (macOS); Safari (iOS) |
| TalkBack      | Android              | Chrome                       |

For the most-coverage-per-effort, test **NVDA + Firefox** and
**VoiceOver + Safari** - these are also the WAI-recommended pairs.

Start each script by naming the SR + browser + OS combination.

## Step 2 - Define the flow

A flow is a sequence of user goals. Don't write step-by-step
keystrokes upfront - that's Step 3. The flow is at user-intent
level:

```yaml
flow_name: "User edits their profile email"
preconditions:
  - User is logged in.
  - User is on the /profile page.
  - Screen reader is on; browser virtual cursor is at the page heading.

steps:
  - intent: "Navigate to the profile-edit form via main nav"
  - intent: "Tab through the form to the email field"
  - intent: "Edit the email value to a new valid email"
  - intent: "Submit the form"
  - intent: "Hear the success confirmation announcement"
```

## Step 3 - Per intent, capture keystrokes + expected announcement

For each intent, the script row lists three things:

- **Keystroke** - the actual key combo the tester presses.
- **Expected announcement** - what the screen reader should say.
- **Why** - the WCAG SC or APG pattern the announcement satisfies.

NVDA browse mode navigates with quick-keys (`H` by heading, `F` by
form field); VoiceOver uses VO (Ctrl+Option) chords:

| Action                | VoiceOver shortcut                          |
|-----------------------|---------------------------------------------|
| Read next / previous  | VO + Right / Left arrow                      |
| Next heading          | VO + Cmd + H                                 |
| Next form control     | VO + Cmd + J                                 |
| Activate (Enter)      | VO + Space                                   |
| Web rotor             | VO + U (form / heading / link list overlay) |

A minimal NVDA + Firefox excerpt for the flow "User edits their
profile email":

| Keystroke  | Expected announcement                                    |
|------------|----------------------------------------------------------|
| H          | "Edit profile, heading level 2" - moves to next heading. |
| F          | "Email, edit, blank" - jumps to the first form field.    |
| Tab, Enter | "Save changes, button", then a live region announces "Profile saved". |

Full per-reader scripts (NVDA + Firefox and VoiceOver + Safari) for
this flow, with the WCAG / APG mapping in the "Why" column:
[references/screen-reader-scripts.md](references/screen-reader-scripts.md).

VoiceOver announcements are sometimes more verbose than NVDA's (role
words like "edit text" where NVDA says "edit"); that is a vendor
convention, not a bug to suppress.

## Step 4 - Define what counts as PASS

For each step, the announcement should:

1. **Identify the element type** - "button", "edit", "link",
   "heading level 2", etc.
2. **Read the visible label** verbatim - if the visible label is
   "Save changes", the SR should say "Save changes" (not "Submit"
   or the `id` attribute).
3. **Convey state** - for a checkbox, "checked" / "not checked";
   for a button, "expanded" / "collapsed" / "pressed".
4. **Convey position in a set** - for a tab, "1 of 4"; for a list
   item, "1 of 10".

Failures to flag:

| Failure                                                       | Likely cause                                          |
|---------------------------------------------------------------|-------------------------------------------------------|
| Announcement reads CSS class names or `id` attributes          | Label is missing; SR fell back to other text.         |
| Element type is wrong ("link" instead of "button")             | `<a>` used as a button; or `role="link"` on a button. |
| State is missing                                                | `aria-expanded` / `aria-checked` not set.             |
| Position-in-set is missing                                     | `aria-setsize` / `aria-posinset` not set on list items. |
| Live region announcement doesn't fire                          | Region added with content already present, OR `aria-live="off"`. |

## Step 5 - Wire to the test plan

The script becomes a **manual test** in the project's test plan.
Common formats:

### Markdown checklist (lightweight)

```markdown
## A11y Acceptance - User edits profile email

### NVDA + Firefox (Windows)

- [ ] Step 1: Pressing H twice lands on "Profile information" heading.
- [ ] Step 2: Pressing F lands on the email field; announces "Email, edit, blank".
- [ ] Step 3: After submit, a live region announces "Profile saved".

### VoiceOver + Safari (macOS)

- [ ] Step 1: VO+Cmd+H twice lands on "Profile information" heading.
- [ ] Step 2: VO+Cmd+J lands on email; announces "Email, edit text".
- [ ] Step 3: After submit, live region announces "Profile saved".

Sign-off: ___________________ Date: __________
```

### Test-management tool integration

For teams using TestRail / Xray / Zephyr - encode the flow as a
manual test case with one step per row, expected result per row.
The skill emits the matching format; per
`testrail-integration`
(when shipped) the test case can be uploaded automatically.

## Anti-patterns

| Anti-pattern                                                  | Why it fails                                                       | Fix |
|---------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Testing on only one screen reader                              | NVDA bugs ≠ JAWS bugs ≠ VoiceOver bugs.                            | At least two reader/browser pairs (NVDA+Firefox, VoiceOver+Safari). |
| Asking the developer to test their own work                    | Familiarity bias; the dev knows how it should sound.                | Independent tester or accessibility specialist; use the script blindly. |
| Recording expected announcements verbatim from one version     | Screen-reader announcement strings change between versions.        | Test the announcement *contains* key elements (label, role, state); avoid string-equality. |
| Skipping the "Why" column                                      | Tester can't generalize from "this announcement was wrong" to "the underlying ARIA pattern is broken." | Always link to the WCAG SC or APG pattern. |

## Limitations

- **Manual.** Cannot fully automate; the tester is the QA
  instrument.
- **Vendor variance.** A test script that passes on NVDA might
  fail on JAWS due to vendor-specific announcement choices; the
  underlying code may be correct.
- **Mobile tests.** TalkBack and iOS VoiceOver have very different
  gesture sets from desktop SRs; mobile flows need separate
  scripts.

## References

- W3C WCAG 2.2 - https://www.w3.org/TR/WCAG22/
- WebAIM Screen Reader Survey - https://webaim.org/projects/screenreadersurvey/
- NVDA documentation - https://www.nvaccess.org/files/nvda/documentation/userGuide.html
- VoiceOver Getting Started - https://www.apple.com/accessibility/mac/vision/ + Apple developer docs
- `wcag-keyboard-navigation`,
  `aria-authoring-patterns` - patterns this skill references for the "Why" column.
