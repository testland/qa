# redesign/nav-v2 - status as of 2026-09-11

Branch off `main` at `a71f004`, 38 commits ahead, not merged. Target: merge
week of 2026-09-21.

### Open review threads: 14

Unresolved, across 6 files. Four are on visual behaviour: the focus ring on the
account menu, the divider weight in the collapsed rail, the hover transition
timing, and the avatar fallback initials.

### Open defects

| ID      | Summary                                                                 | State       |
|---------|-------------------------------------------------------------------------|-------------|
| NAV-218 | Mobile drawer overlaps the sticky header at 390px; header is unreachable | fix pending |
| NAV-224 | Account menu renders behind the page content in Safari 17               | fix pending |

### Design

Priya approved the Figma file on 2026-09-02.

### Scope

The nav chrome renders in the shell around nearly every route, so roughly 300 of
the app's 1,140 stories change appearance when this branch lands. The other ~840
are unrelated to this work and are untouched by the branch.
