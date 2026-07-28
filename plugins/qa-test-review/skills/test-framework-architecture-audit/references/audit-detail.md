# test-framework-architecture-audit - worked example and anti-patterns

Deep-dive detail for `test-framework-architecture-audit`. The eight axes, their
bands, and the numeric cuts live in `SKILL.md`; this file carries a full worked
audit and the anti-pattern table.

## Worked example

A Playwright and TypeScript framework: 312 test files, 38 page objects, 14
fixture modules, 47 helper modules. `docs/test-conventions.md` exists and states
seven rules. Call-site window: 90 days.

- **A1.** 237 of 312 files import from the page-object directory: 76% coverage.
  Three page objects contain `expect(` calls; one navigation method returns
  `void`. In the 70-to-90 band with binary violations either way: **WARN**.
  Largest offender is the checkout directory, 11 of 14 files holding raw locators.
- **A2.** `CheckoutPage` extends `CartFlowPage` extends `EcommercePage` extends
  `BasePage`: depth 4, **FAIL**. Any `BasePage` edit reaches leaf specs through
  three layers and the failure names none of them. Fix: collapse the two
  intermediate classes into composition at the base tier.
- **A3.** All 14 fixture modules test-scoped or worker-scoped read-only, largest
  180 lines: **PASS**.
- **A4.** 47 helpers to 312 tests is 1:6.6, inside the WARN band. 11 helpers have
  fewer than two call sites in the window (candidates, not confirmed). One name
  family: `http-helper`, `api-helper`, `request-helper`. **WARN**.
- **A5.** File suffix `*.spec.ts` 78%, `*.test.ts` 15%, `*_test.ts` 7%: only one
  pattern clears 20%, so **not drifted**, and the minority patterns become
  hygiene notes. Element targeting `data-testid` 55% against role-based 41%: two
  above 20%, so that dimension **is** drifted. One of four: **WARN**.
- **A6.** 18 fixed-duration sleeps across 9 files, four distinct timeout values,
  no retry contradiction. Over the 5-sleep cut: **FAIL**.
- **A7.** Four of seven documented rules below 80%, worst "always use role-based
  locators" at 61%, none below 50%: **WARN**. The 61% and the A5 element-targeting
  drift are the same fact from two angles, so one migration closes both.
- **A8.** Sharded four ways with merged reports, JUnit XML, traces on first retry,
  `retries: 1`, secrets from the CI store. Six of six, no anti-pattern: **PASS**.

Rollup: two FAILs, so the verdict is **FAIL**. Fix order: A6 (18 sleeps, each
with its web-first replacement listed), then A2 (collapse the depth-4 chain),
then A1 (checkout directory), then A4, then A5 and A7 sequenced together since
one migration closes both.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Opening individual test files and reviewing their assertions or locators | Duplicates a per-file review and buries the cross-file findings in noise | Every axis here is a pattern across files. If a finding fits in one file, it is not this audit's |
| Reporting A7 drift with no conventions doc | The baseline is undefined, so "drifted from what?" has no answer and the finding gets dismissed | Emit `n/a` and name the missing document |
| Counting helper modules without call sites | 47 helpers is not a number until you know how many are reachable | Report the ratio and the call-site distribution together |
| Flagging a sleep without its idiomatic replacement | The team reimplements it by hand: same defect, new syntax | Print the framework's waiting alternative next to every instance |
| Treating depth 3 as automatically broken | Some products genuinely need a shared intermediate tier | WARN at 3, FAIL at 4, honor a written exemption at 3 |
| Reporting all eight axes as equally urgent | Sleeps cost a re-run this week; naming drift costs nothing until someone joins | Rank by blast radius, always |
| Presenting the cuts as industry standards | Every numeric band except the object-model rules is this audit's convention | Print the conventions list in the output |
| Auditing a framework mid-migration and reporting the migration as drift | Two conventions coexisting on purpose is not drift, it is a plan in progress | Ask whether a migration is running before scoring A5 and A7; if so, report progress against it instead |
| Running this instead of a suite-level audit | They measure different objects and return different findings | Run both, or state plainly which question you answered |
