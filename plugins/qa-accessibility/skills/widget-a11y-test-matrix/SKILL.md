---
name: widget-a11y-test-matrix
description: "Per-widget manual accessibility test matrices where every row pairs one keystroke with the expected focus behavior, the expected NVDA announcement, the expected VoiceOver announcement, and the WCAG 2.2 success criterion that row verifies. Covers button, toggle button, checkbox, text input, modal dialog, menu button, and combobox archetypes, plus universal Tab traversal. Use when a rendered widget has cleared automated scanning and a tester needs a fill-in pass/fail sheet to run by hand against NVDA and VoiceOver."
---

# widget-a11y-test-matrix

## What this owns, and what it does not

This is a **per-widget matrix**. One row = one keystroke + the expected focus
behavior + the expected NVDA announcement + the expected VoiceOver announcement
+ the WCAG 2.2 success criterion that row verifies. All four live in the same
row so that a failure is attributable the moment it is observed: the tester
knows which key produced it, which stack disagreed, and which criterion is at
risk.

Deliberately out of scope, and better served elsewhere:

- **Per-criterion conformance references.** A catalog organized by success
  criterion (what 2.4.3 requires, what fails it, how to remediate) answers "what
  does this criterion mean". This skill answers "which key, on which widget,
  should produce which announcement".
- **Per-ARIA-pattern authoring references.** A catalog organized by widget
  pattern (which roles, which states, which DOM structure) tells an implementer
  how to build the widget. This skill assumes the widget already exists and is
  rendered.
- **Per-flow screen-reader narratives.** A script that walks one user journey
  ("user edits their profile email") end to end is organized by task. This skill
  is organized by widget archetype, so the same block is reused on every screen
  that contains that widget.
- **Automated scanning.** Rule engines cannot observe focus order in practice,
  cannot hear an announcement, and cannot confirm focus returned to the trigger.
  Run automated scanning first to clear structural defects, then run this matrix.

## Announcement strings are expectations, not guarantees

Screen readers report a control's accessible name, its role, and its state, but
the exact wording is chosen by the screen reader and varies by version and by
paired browser. NVDA's focus reporting "announces the current object or control
that has the System focus", including name, type, value, state, description and
position ([NVDA User Guide](https://download.nvaccess.org/documentation/userGuide.html)).
WebAIM describes the same model for NVDA: "When focusing a form control, its
label is read by NVDA, and then the type of form control"
([WebAIM: Using NVDA](https://webaim.org/articles/nvda/)).

Treat every string in the matrices below as a **containment assertion**: the
announcement must contain the accessible name, the role word, and any applicable
state word. Do not assert string equality. Record the actual string in the Notes
column, and record the NVDA version, VoiceOver / macOS version, and browser at
the top of the sheet.

## Test stacks

Run two stacks, because a defect that one stack papers over the other exposes:

| Stack | Modifier / entry convention |
|---|---|
| NVDA on Windows, paired with Firefox | The NVDA modifier is `numpadZero` (with NumLock off) or `insert`, and can be remapped to Caps Lock ([NVDA User Guide](https://download.nvaccess.org/documentation/userGuide.html)). Browse mode uses single-letter navigation: `h` heading, `f` form field, `k` link, `d` landmark, `l` list, `t` table; add Shift to move backwards (same guide). |
| VoiceOver on macOS, paired with Safari | "VO represents the VoiceOver modifier that you press with additional keys to enter VoiceOver commands. By default, you can press Control and Option together or just press Caps Lock" ([Apple: Use the VoiceOver rotor on Mac](https://support.apple.com/guide/voiceover/voiceover-rotor-mchlp2719/mac)). `VO-Space bar` performs the default action on an item, such as clicking a button ([Apple: Control your Mac using keyboard commands with VoiceOver](https://support.apple.com/guide/voiceover/control-your-mac-with-keyboard-commands-vo2681/mac)). |

VoiceOver does not infer a label from proximity: an explicit `<label for>` or
`aria-label` is required for the field name to be announced
([WebAIM: Using VoiceOver to Evaluate Web Accessibility](https://webaim.org/articles/voiceover/)).

## Step 1: inventory the widget archetypes on screen

List which of the archetype blocks below are present. A screen is almost always
a composition: a form with three text inputs, one checkbox, one combobox, and a
submit button that opens a confirmation dialog uses five blocks.

## Step 2: copy the matching blocks into one sheet

Copy each archetype block verbatim, in the order the widgets appear in the DOM.
Do not paraphrase the expected column; the value of the matrix is that two
testers on different machines assert the same thing.

## Step 3: substitute the placeholders

Replace `{name}` with the widget's **visible** label text, `{option}` with a
real option string, `{error}` with the real validation message. If a widget has
no visible label, that is already a finding: record it against SC 4.1.2 before
running the rest of the block.

## Step 4: run each row and fill Result

Leave the Result column blank in the template. The tester fills `PASS`, `FAIL`,
or `N/A`, and pastes the actual announcement into Notes whenever it differs from
the expectation.

## Step 5: attribute every failure to its row's success criterion

The SC column is the deliverable. A failing row reports as "row 4, Escape did
not close the dialog, SC 2.1.2 Level A" rather than "the dialog is not
accessible".

## The matrices

### Universal traversal (prepend to every sheet)

Sequential navigation with `Tab` and `Shift+Tab` applies to every focusable
element regardless of archetype ([WebAIM: Keyboard Accessibility](https://webaim.org/techniques/keyboard/)).

| # | Key | Expected focus / behavior | Expected NVDA | Expected VoiceOver | WCAG 2.2 SC | Result |
|---|---|---|---|---|---|---|
| U1 | `Tab` repeatedly, first to last | Every interactive element receives focus exactly once, in an order matching the visual and reading order | Each stop announces name and role | Each stop announces name and role | 2.4.3 Focus Order (A); 2.1.1 Keyboard (A) | |
| U2 | `Tab` (observe, do not act) | A visible focus indicator is present at every stop | n/a (visual check) | n/a (visual check) | 2.4.7 Focus Visible (AA) | |
| U3 | `Shift+Tab` back through the same path | Focus retraces the U1 order in reverse | Same names and roles in reverse | Same names and roles in reverse | 2.4.3 Focus Order (A) | |
| U4 | `Tab` continuously past the widget | Focus leaves the widget and continues into the rest of the page | Announces the next page element | Announces the next page element | 2.1.2 No Keyboard Trap (A) | |
| U5 | NVDA `f` / `h` / `d` in browse mode; VoiceOver `VO-U` rotor | Structure navigation reaches the widget by form field, heading, or landmark | Jumps to the next form field, heading, or landmark | Rotor lists the item under its category | 4.1.2 Name, Role, Value (A) | |

Row U4 is the operative check for SC 2.1.2: "If keyboard focus can be moved to a
component using a keyboard interface, then focus can be moved away using only a
keyboard interface" ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)). Inside a modal
dialog the equivalent exit is the Escape row, not `Tab`; see the dialog block.

Row U5's structure keys: NVDA single-letter navigation (`f`, `h`, `d`) per the
[NVDA User Guide](https://download.nvaccess.org/documentation/userGuide.html);
the VoiceOver rotor opens with `VO-U`, or with `VO-Command-Left Arrow` /
`VO-Command-Right Arrow`, and items within a category are reached with the
Up Arrow and Down Arrow keys
([Apple: Use the VoiceOver rotor on Mac](https://support.apple.com/guide/voiceover/voiceover-rotor-mchlp2719/mac)).

### Button

APG specifies "Space: Activates the button. Enter: Activates the button", the
element "has role of button", and it "has an accessible label", by default
computed from its text content
([APG Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)).

| # | Key | Expected focus / behavior | Expected NVDA | Expected VoiceOver | WCAG 2.2 SC | Result |
|---|---|---|---|---|---|---|
| B1 | `Tab` | Button receives focus; visible indicator | "{name}, button" | "{name}, button" | 4.1.2 (A); 2.4.7 (AA) | |
| B2 | `Enter` | The button's action fires | Result of the action announced or observed | Result of the action announced or observed | 2.1.1 Keyboard (A) | |
| B3 | `Space` | The same action fires as for `Enter` | Same as B2 | Same as B2 | 2.1.1 Keyboard (A) | |
| B4 | `VO-Space bar` (VoiceOver only) | The button's default action fires | n/a | Same as B2 | 2.1.1 Keyboard (A) | |
| B5 | `Tab` onto a button whose action is unavailable | Button is still reachable when marked `aria-disabled="true"` | "{name}, button, unavailable" | "{name}, dimmed, button" | 4.1.2 (A) | |

Row B5 covers the APG convention that "When the action associated with a button
is unavailable, the button has aria-disabled set to `true`"
([APG Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)). A
native `disabled` attribute instead removes the control from the tab sequence,
so B5 becomes `N/A` rather than a failure.

### Toggle button

"If the button is a toggle button, it has an aria-pressed state. When the button
is toggled on, the value of this state is `true`, and when toggled off, the state
is `false`." The label must stay constant across toggles
([APG Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)).

| # | Key | Expected focus / behavior | Expected NVDA | Expected VoiceOver | WCAG 2.2 SC | Result |
|---|---|---|---|---|---|---|
| T1 | `Tab` (state off) | Button receives focus | "{name}, toggle button, not pressed" | "{name}, toggle button, off" | 4.1.2 (A); 2.4.7 (AA) | |
| T2 | `Space` | State flips to on; the visible label does not change | "pressed" announced on the state change | "on" announced on the state change | 4.1.2 (A); 2.1.1 (A) | |
| T3 | `Space` again | State flips back to off | "not pressed" | "off" | 4.1.2 (A) | |
| T4 | `Shift+Tab` then `Tab` back | Re-entering the button re-announces the current state | "{name}, toggle button, pressed" | "{name}, toggle button, on" | 4.1.2 (A) | |

If the label text changes between T2 and T3 (for example "Mute" becoming
"Unmute" while `aria-pressed` also flips), record it: the state is being
conveyed twice and contradictorily, against the APG note above.

### Checkbox

"When the checkbox has focus, pressing the Space key changes the state of the
checkbox." The element "has role checkbox", with `aria-checked` set to `true`,
`false`, or `mixed`
([APG Checkbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)).

| # | Key | Expected focus / behavior | Expected NVDA | Expected VoiceOver | WCAG 2.2 SC | Result |
|---|---|---|---|---|---|---|
| C1 | `Tab` (unchecked) | Checkbox receives focus | "{name}, check box, not checked" | "{name}, checkbox, unchecked" | 4.1.2 (A); 2.4.7 (AA) | |
| C2 | `Space` | State changes to checked | "checked" | "checked" | 2.1.1 (A); 4.1.2 (A) | |
| C3 | `Space` again | State changes back to unchecked | "not checked" | "unchecked" | 4.1.2 (A) | |
| C4 | `Tab` onto a tri-state checkbox in the mixed state | Focus lands on the control | "half checked" or "partially checked" | "mixed" | 4.1.2 (A) | |
| C5 | `Enter` | No state change expected; Space is the state key per APG | No state announcement | No state announcement | 4.1.2 (A) | |

Row C4 wording differs most across versions of both stacks; assert only that a
third state distinct from checked and unchecked is spoken.

### Text input / form field

`Tab` enters and exits a text field and arrow keys move within the text
([WebAIM: Keyboard Accessibility](https://webaim.org/techniques/keyboard/)).
NVDA switches into focus mode automatically on interactive fields when automatic
focus mode is enabled ([NVDA User Guide](https://download.nvaccess.org/documentation/userGuide.html)).

| # | Key | Expected focus / behavior | Expected NVDA | Expected VoiceOver | WCAG 2.2 SC | Result |
|---|---|---|---|---|---|---|
| F1 | `Tab` | Field receives focus; visible indicator | "{name}, edit" plus current value or "blank" | "{name}, text field" plus current value | 4.1.2 (A); 2.4.7 (AA) | |
| F2 | `Tab` onto a required field | Focus lands; required state exposed | "{name}, edit, required" | "{name}, required, text field" | 4.1.2 (A); 3.3.2 Labels or Instructions (A) | |
| F3 | Type characters | Text is entered; the caret advances | Characters echoed if character echo is on | Characters echoed if key echo is on | 2.1.1 (A) | |
| F4 | `Left Arrow` / `Right Arrow` | Caret moves within the value, focus stays in the field | Character at the caret spoken | Character at the caret spoken | 2.1.1 (A) | |
| F5 | `Tab` | Focus moves to the next control in DOM order | Next control's name and role | Next control's name and role | 2.4.3 (A) | |
| F6 | `Shift+Tab` | Focus returns to the previous control | Previous control's name and role | Previous control's name and role | 2.4.3 (A) | |
| F7 | `Tab` onto a field carrying a validation error | Focus lands; the error text is associated, typically via `aria-describedby` | "{name}, edit, invalid entry, {error}" | "{name}, text field, {error}" | 3.3.1 Error Identification (A); 4.1.2 (A) | |

SC 3.3.1 requires that "if an input error is automatically detected, the item
that is in error is identified and the error is described to the user in text"
([WCAG 2.2](https://www.w3.org/TR/WCAG22/)). Row F7 fails if the error is only a
red border or an icon, even when the field is otherwise announced correctly.

### Modal dialog

APG specifies the container has `role="dialog"` with `aria-modal="true"` and is
labeled by `aria-labelledby` or `aria-label`
([APG Dialog (Modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)).

| # | Key | Expected focus / behavior | Expected NVDA | Expected VoiceOver | WCAG 2.2 SC | Result |
|---|---|---|---|---|---|---|
| D1 | `Enter` or `Space` on the trigger | "When a dialog opens, focus moves to an element inside the dialog" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)) | "{dialog name}, dialog" then the focused element | "{dialog name}, web dialog" then the focused element | 2.1.1 (A); 4.1.2 (A) | |
| D2 | `Tab` from the last tabbable element | "Moves focus to the next tabbable element inside the dialog. If focus is on the last tabbable element inside the dialog, moves focus to the first tabbable element inside the dialog" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)) | First element's name and role | First element's name and role | 2.4.3 (A) | |
| D3 | `Shift+Tab` from the first tabbable element | "Moves focus to the previous tabbable element inside the dialog. If focus is on the first tabbable element inside the dialog, moves focus to the last tabbable element inside the dialog" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)) | Last element's name and role | Last element's name and role | 2.4.3 (A) | |
| D4 | `Tab` cycling repeatedly | "Tab and Shift + Tab do not move focus outside the dialog" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)); nothing behind the overlay is reached | Only dialog content announced | Only dialog content announced | 2.4.3 (A) | |
| D5 | `Escape` | "Closes the dialog" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)); this is the keyboard exit that satisfies SC 2.1.2 given D4 | The trigger's name and role re-announced | The trigger's name and role re-announced | 2.1.2 (A) | |
| D6 | `Enter` or `Space` on the close button | Dialog closes; "focus returns to the element that invoked the dialog" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)) | "{trigger name}, button" | "{trigger name}, button" | 2.4.3 (A) | |

Read D4 and D5 together. An intentional focus cycle is a design requirement of
the pattern, not a violation, **only because** D5 provides a keyboard exit. If
D5 fails while D4 passes, the widget is a keyboard trap under SC 2.1.2, not a
correctly implemented dialog.

### Menu button

APG specifies the trigger has `role="button"`, `aria-haspopup` "set to either
`menu` or `true`", and `aria-expanded` set to `true` when the menu is displayed
and `false` when it is hidden
([APG Menu Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)).
Behavior once the menu is open is defined by the menu pattern
([APG Menu and Menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)).

| # | Key | Expected focus / behavior | Expected NVDA | Expected VoiceOver | WCAG 2.2 SC | Result |
|---|---|---|---|---|---|---|
| M1 | `Tab` | Trigger receives focus, collapsed | "{name}, button, collapsed" or "has pop up menu" | "{name}, pop up button, collapsed" | 4.1.2 (A); 2.4.7 (AA) | |
| M2 | `Enter` | "opens the menu and places focus on the first menu item" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)) | "{first item}, menu item, 1 of {n}" | "{first item}, menu item" | 2.1.1 (A); 4.1.2 (A) | |
| M3 | `Space` | "Opens the menu and places focus on the first menu item" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)) | Same as M2 | Same as M2 | 2.1.1 (A) | |
| M4 | `Down Arrow` on the trigger | "(Optional) opens the menu and moves focus to the first menu item" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)); mark `N/A` if unimplemented | Same as M2 | Same as M2 | 2.1.1 (A) | |
| M5 | `Up Arrow` on the trigger | "(Optional) opens the menu and moves focus to the last menu item" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)); mark `N/A` if unimplemented | "{last item}, menu item, {n} of {n}" | "{last item}, menu item" | 2.1.1 (A) | |
| M6 | `Down Arrow` inside the menu | "When focus is in a menu, moves focus to the next item, optionally wrapping from the last to the first" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)) | "{item}, menu item, {i} of {n}" | "{item}, menu item" | 2.4.3 (A); 4.1.2 (A) | |
| M7 | `Up Arrow` inside the menu | "When focus is in a menu, moves focus to the previous item, optionally wrapping from the first to the last" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)) | Previous item announced | Previous item announced | 2.4.3 (A) | |
| M8 | `Home` / `End` inside the menu | "If arrow key wrapping is not supported, moves focus to the first item" / "to the last item in the current menu or menubar" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)) | First / last item announced | First / last item announced | 2.1.1 (A) | |
| M9 | `Escape` inside the menu | "Close the menu that contains focus and return focus to the element or context, e.g., menu button or parent menuitem, from which the menu was opened" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)) | "{name}, button, collapsed" | "{name}, pop up button, collapsed" | 2.1.2 (A); 2.4.3 (A) | |
| M10 | `Enter` on a menu item | "Activates the item and closes the menu" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)) | Action result; then the trigger re-announced | Action result; then the trigger re-announced | 2.1.1 (A) | |

### Combobox

APG specifies `role="combobox"` on the input, `aria-expanded` set to `false` when
the popup is hidden and `true` when visible, `aria-controls` referencing the
popup, and `aria-activedescendant` referencing the focused popup element
([APG Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)).

| # | Key | Expected focus / behavior | Expected NVDA | Expected VoiceOver | WCAG 2.2 SC | Result |
|---|---|---|---|---|---|---|
| K1 | `Tab` | "The combobox is in the page Tab sequence" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)); popup hidden | "{name}, combo box, collapsed" | "{name}, combo box" plus current value | 4.1.2 (A); 2.4.7 (AA) | |
| K2 | `Down Arrow` on the combobox | "If the popup is available, moves focus into the popup" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)) | "expanded" then "{option}, 1 of {n}" | "expanded" then "{option}" | 2.1.1 (A); 4.1.2 (A) | |
| K3 | `Alt+Down Arrow` on the combobox | "If the popup is available but not displayed, displays the popup without moving focus" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)) | "expanded"; focus stays on the input | "expanded"; focus stays on the input | 4.1.2 (A) | |
| K4 | `Up Arrow` on the combobox | "If the popup is available, places focus on the last focusable element in the popup" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)) | "{last option}, {n} of {n}" | "{last option}" | 2.1.1 (A) | |
| K5 | `Down Arrow` in the popup | "Moves focus to and selects the next option" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)) | "{option}, {i} of {n}, selected" | "{option}, selected" | 2.4.3 (A); 4.1.2 (A) | |
| K6 | `Up Arrow` in the popup | "Moves focus to and selects the previous option" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)) | Previous option plus position and selection state | Previous option plus selection state | 2.4.3 (A) | |
| K7 | `Enter` in the popup | "Accepts the focused option in the listbox by closing the popup, placing the accepted value in the combobox" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)) | "{option}" then "collapsed" | "{option}" then the input's new value | 2.1.1 (A); 4.1.2 (A) | |
| K8 | `Escape` in the popup | "Closes the popup and returns focus to the combobox" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)) | "{name}, combo box, collapsed" | "{name}, combo box" | 2.1.2 (A); 2.4.3 (A) | |
| K9 | `Tab` with the popup open | Focus leaves the combobox entirely and reaches the next page control | Next control's name and role | Next control's name and role | 2.1.2 (A) | |

## Success criterion lookup

Every SC referenced above, with its normative anchor. All are current in
WCAG 2.2 ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).

| SC | Title | Level | What a matrix row proves |
|---|---|---|---|
| 2.1.1 | Keyboard | A | "All functionality of the content is operable through a keyboard interface without requiring specific timings for individual keystrokes." |
| 2.1.2 | No Keyboard Trap | A | "If keyboard focus can be moved to a component using a keyboard interface, then focus can be moved away using only a keyboard interface." |
| 2.4.3 | Focus Order | A | "If a web page can be navigated sequentially and navigation sequences affect meaning or operation, focusable components receive focus in an order that preserves meaning." |
| 2.4.7 | Focus Visible | AA | "Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible." |
| 3.3.1 | Error Identification | A | The item in error is identified and the error is described to the user in text. |
| 3.3.2 | Labels or Instructions | A | Labels or instructions are provided when content requires user input. |
| 4.1.2 | Name, Role, Value | A | "For all user interface components, the name and role can be programmatically determined; states, properties, and values that can be set by the user can be programmatically set; and notification of changes to these items is available to user agents, including assistive technologies." |

Do not cite 4.1.1 Parsing on any row. "WCAG 2.2 has removed one success
criterion, 4.1.1 Parsing" ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).

## Worked example

A `ConfirmDeleteDialog` opened by a "Delete project" button, containing a
"Type the project name to confirm" text input and Cancel / Delete buttons. The
sheet composes: Universal traversal, Button (trigger), Modal dialog, Text input,
Button (Cancel), Button (Delete).

```markdown
# Widget accessibility matrix: ConfirmDeleteDialog

Stack A: NVDA 2025.1 + Firefox 141 on Windows 11
Stack B: VoiceOver on macOS 15.4 + Safari 18.4
Tester: ____________________   Date: 2026-07-19

| # | Key | Expected focus / behavior | Expected NVDA | Expected VoiceOver | WCAG 2.2 SC | Result | Notes |
|---|---|---|---|---|---|---|---|
| U1 | Tab first to last | 4 stops, DOM order = visual order | name + role each stop | name + role each stop | 2.4.3 (A) | | |
| U2 | Tab (observe) | focus ring visible at all 4 stops | n/a | n/a | 2.4.7 (AA) | | |
| B1 | Tab | "Delete project" button focused | "Delete project, button" | "Delete project, button" | 4.1.2 (A) | | |
| D1 | Enter on trigger | focus moves inside the dialog | "Confirm delete, dialog" | "Confirm delete, web dialog" | 2.1.1 (A) | | |
| D2 | Tab from Delete (last) | wraps to the text input (first) | "Project name, edit, blank" | "Project name, text field" | 2.4.3 (A) | | |
| D4 | Tab x6 | page behind is never reached | dialog content only | dialog content only | 2.4.3 (A) | | |
| F7 | Tab to input after bad value | error text associated | "Project name, edit, invalid entry, Names do not match" | "Project name, text field, Names do not match" | 3.3.1 (A) | | |
| D5 | Escape | dialog closes | "Delete project, button" | "Delete project, button" | 2.1.2 (A) | | |
| D6 | Enter on Cancel | dialog closes, focus returns to trigger | "Delete project, button" | "Delete project, button" | 2.4.3 (A) | | |
```

A completed run reports as a per-row verdict list, not a prose summary:

```text
ConfirmDeleteDialog: 7 PASS, 2 FAIL, 0 N/A
FAIL D5  Escape (NVDA + Firefox)   SC 2.1.2 A   dialog stayed open; no keyboard exit
FAIL F7  Tab to errored input (both stacks)  SC 3.3.1 A   heard "Project name, edit"; error text not announced
```

## Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Asserting the announcement string with `==` | Wording is chosen by the screen reader and drifts across versions and paired browsers. Assert that name, role, and state are each contained in the announcement. |
| Running one stack only | NVDA and VoiceOver expose different bugs on the same markup, and each is paired with a different browser engine. A row that passes on one stack says nothing about the other. |
| Recording only "Tab reaches it" | Reachability satisfies part of SC 2.1.1 and nothing else. The order (2.4.3), the indicator (2.4.7), and the announced role and state (4.1.2) are separate rows for a reason. |
| Marking the dialog block PASS because focus cycles | The cycle is only correct in combination with a working Escape row. Without it the same behavior is a SC 2.1.2 keyboard trap. |
| Filling Result from the code rather than the running widget | The matrix asserts observed runtime behavior. Static review of the source is a different activity and does not substitute for it. |
| Substituting an automated scan for the sheet | Rule engines detect structural defects only; they cannot hear an announcement, judge focus order, or confirm focus returned to the trigger. |

## Limitations

- **Version drift.** Every announcement column is a starting expectation.
  Re-derive them against the exact NVDA build, VoiceOver / macOS version, and
  browser under test, and record those versions on the sheet.
- **Browser pairing changes results.** The same markup can announce differently
  under NVDA with Chrome than with Firefox. Pin the pairing per stack and note it
  in the report.
- **Asynchronous updates.** Widgets that populate options lazily or announce via
  live regions need tester judgment on timing. The matrix fixes the expected end
  state, not the acceptable latency.
- **Archetype coverage.** The blocks here cover button, toggle button, checkbox,
  text input, modal dialog, menu button, and combobox. Other patterns exist in the
  [APG pattern index](https://www.w3.org/WAI/ARIA/apg/patterns/); derive a new
  block from that pattern's keyboard interaction table rather than improvising one.
- **No visual or color coverage.** Contrast ratios, color-only status cues, and
  target size are outside these matrices; the only visual assertion here is
  "a focus indicator is present" for SC 2.4.7.
- **Manual by construction.** The tester is the instrument. These matrices
  produce a signed sheet, not a CI signal.
