# Engineering tooling consolidation — findings and recommendation

Prepared for the platform engineering group, 2026-09-07.

## Finding

Four browser-automation stacks are in use across eleven teams. Training,
licensing for the two hosted grids, and the maintenance of four sets of CI glue
are duplicated cost with no corresponding benefit.

## Recommendation

Consolidate on **Playwright** for all browser automation, group-wide, over four
quarters.

Rationale:

- It is the fastest-growing framework in the space by adoption.
- It supports every language any of our teams write in, so no team is forced to
  change languages as part of the move.
- It is standards-based browser automation, so any contractual commitments
  around test tooling are unaffected by the switch.
- One framework means one training budget, one hiring profile and one set of CI
  templates.

## Suggested sequencing

1. New projects adopt it immediately — there is no migration cost on a project
   with no tests.
2. Existing suites port module by module, oldest and largest first, so the
   biggest maintenance burden is retired soonest.
