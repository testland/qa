# Framework architecture audit - Ardent scheduling suite - 2026-07-14

Cross-file findings only. Per-file review is the pull-request check's job and
is not repeated here.

1. Three interaction models coexist: `pages/`, `tasks/` + `actors/`, and
   direct store dispatch. Seven specs use more than one. Interviewed
   engineers report choosing by "whichever the nearest file used". No
   convention exists to point them at.

2. Documented-versus-actual drift: section skipped. There is no written
   convention anywhere in the repository to compare the code against. Same
   outcome in 2026-Q1 and in 2025-Q4.

3. `tests/pages/SchedulePage.ts` carries assertions. Screen objects returning
   verdicts rather than state is a per-pattern issue, noted here only because
   it is repeated across 9 of the 22 objects.

4. The debug hook `window.__ardent.store` is registered by the app only when
   the bundle is built with `NODE_ENV !== 'production'`. 31 specs call it.
   Two of those 31 carry the `@smoke` tag.

5. Unit tier (`test/`, 96 tests, owned by the service teams) is out of scope
   for this suite and was not reviewed. No findings.
