# Extended widget matrices and success-criterion lookup

The menu button and combobox archetypes plus the WCAG 2.2 success-criterion
lookup table, moved out of SKILL.md to keep the core matrices lean. Copy the
matching block into the sheet exactly as with the archetypes in SKILL.md:
substitute `{name}` / `{option}` / `{error}`, leave Result blank, run each row,
and attribute every failure to its row's success criterion.

## Menu button

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

## Combobox

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

Every SC the matrices cite, with its normative anchor. All are current in
WCAG 2.2 ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).

| SC | Title | Level | What a matrix row proves |
|---|---|---|---|
| 2.1.1 | Keyboard | A | "All functionality of the content is operable through a keyboard interface without requiring specific timings for individual keystrokes, except where the underlying function requires input that depends on the path of the user's movement and not just the endpoints." |
| 2.1.2 | No Keyboard Trap | A | "If keyboard focus can be moved to a component of the page using a keyboard interface, then focus can be moved away from that component using only a keyboard interface, and, if it requires more than unmodified arrow or tab keys or other standard exit methods, the user is advised of the method for moving focus away." |
| 2.4.3 | Focus Order | A | "If a web page can be navigated sequentially and the navigation sequences affect meaning or operation, focusable components receive focus in an order that preserves meaning and operability." |
| 2.4.7 | Focus Visible | AA | "Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible." |
| 3.3.1 | Error Identification | A | The item in error is identified and the error is described to the user in text. |
| 3.3.2 | Labels or Instructions | A | Labels or instructions are provided when content requires user input. |
| 4.1.2 | Name, Role, Value | A | "For all user interface components (including but not limited to: form elements, links and components generated by scripts), the name and role can be programmatically determined; states, properties, and values that can be set by the user can be programmatically set; and notification of changes to these items is available to user agents, including assistive technologies." |

Do not cite 4.1.1 Parsing on any row. "WCAG 2.2 has removed one success
criterion, 4.1.1 Parsing" ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).
