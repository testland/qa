# Suite inventory - 2026-09-05

|                                                      | Count |
|------------------------------------------------------|-------|
| Browser specs (`tests/**/*.spec.ts`)                  | 210   |
| Unit tests (`test/**`, node --test)                   | 96    |
| Screen objects (`tests/pages/`)                       | 22    |
| Tasks (`tests/tasks/`)                                | 6     |
| Actors (`tests/actors/`)                              | 3     |
| Specs using `tasks/` + `actors/`                      | 18    |
| Specs calling `window.__ardent.store.dispatch` direct | 31    |
| Specs using `pages/` only                             | 161   |
| Specs mixing more than one of the three               | 7     |

Runner: Playwright Test, TypeScript. There is no other runner in the repo for
the browser tier.

Roles the suite drives. All four share the same scheduling, messaging and
document-upload interactions, differing only in what they are permitted to do
with them:

- patient (self-service booking)
- scheduler (front desk, books on behalf of patients)
- clinician (views and reschedules their own calendar)
- billing admin (reads appointments, cannot book)

Growth: 210 specs today, 128 of them added in the last twelve months. The
2027 roadmap adds two more service lines; the planning estimate we submitted
was 380-420 specs by the end of 2027.

Team: 5 engineers write these tests, all TypeScript.
