# Per-screen-reader worked scripts

Full NVDA + Firefox and VoiceOver + Safari scripts for the sample
flow "User edits their profile email." SKILL.md Step 3 has the row
template, the VoiceOver chord table, and a minimal excerpt; these
are the complete per-reader versions, including the WCAG SC / APG
notes that populate the "Why" column.

## NVDA + Firefox (Windows)

```markdown
## NVDA + Firefox (Windows) - User edits their profile email

### Pre-conditions
- NVDA is running.
- Firefox is on https://app.example.com/profile.
- Virtual cursor mode is on (NVDA default for browsers).

### Step 1 - Navigate to the profile-edit form

| Keystroke | Expected announcement                                          |
|-----------|----------------------------------------------------------------|
| H         | "Edit profile, heading level 2" - moves to next heading.       |
| H         | "Profile information, heading level 3" - moves further.        |
| F         | "Email, edit, blank" - jumps to first form field.              |

NVDA's `H` quick-key navigates by heading; `F` by form field.
The announcements should match the visible heading text and field
labels (per WCAG SC 2.4.6 Headings and Labels).

### Step 2 - Edit the email value

| Keystroke         | Expected announcement                                  |
|-------------------|--------------------------------------------------------|
| Enter (focus mode) | "Email, edit, has autocomplete" - enters focus mode.  |
| (type new email)  | (each character spoken if `say characters` is on)     |

### Step 3 - Submit the form

| Keystroke | Expected announcement                                          |
|-----------|----------------------------------------------------------------|
| Tab       | "Save changes, button" - moves to submit.                       |
| Enter     | (no announcement immediately; wait for live region)             |

### Step 4 - Success confirmation

| Behavior          | Expected announcement                                          |
|-------------------|----------------------------------------------------------------|
| (page response)   | "Profile saved" - announced via `aria-live="polite"` region.   |

If no announcement: the success region is missing `aria-live`
attribute, OR the region is added to the DOM with content already
in it (live regions only announce **changes** post-mount).
```

## VoiceOver + Safari (macOS)

VoiceOver uses VO+arrow keys (Ctrl+Option+arrow) and different
quick-key patterns from NVDA. Re-author the same flow:

```markdown
## VoiceOver + Safari (macOS) - User edits their profile email

### Step 1 - Navigate to the profile-edit form

| Keystroke    | Expected announcement                                       |
|--------------|-------------------------------------------------------------|
| VO + Cmd + H | "Edit profile, heading level 2"                              |
| VO + Cmd + J | "Email, edit text"                                           |
```

VoiceOver's announcements are sometimes more verbose than NVDA's
(reads role words like "edit text" where NVDA says "edit"). This is
a vendor convention; don't try to suppress it.
