---
name: test-framework-architecture-audit
description: "Audits an existing test automation framework across eight architecture-tier axes and bands each one PASS, WARN, or FAIL: page-object coverage and purity, base-class inheritance depth, fixture scope and coupling, helper sprawl, naming-convention drift, retry and wait consistency, documented-versus-actual convention drift, and CI integration health. Carries the numeric cut behind every band and labels which cuts are practitioner conventions rather than published standards. Measures the framework's own structure (page objects, base classes, fixtures, helpers, conventions), not the suite's tier mix or flake rate, and not the design of a framework that does not exist yet. Use when a test framework has grown for a release or more without structural review, before a major refactor, or when a team suspects its written test conventions no longer match what the code actually does."
---

# test-framework-architecture-audit

## What this owns, and what it does not

This audit owns **the framework's internal structure**: how many tests reach the
UI through an object model, how deep the inheritance chains run, how fixtures are
scoped, how far helpers have sprawled, whether one naming convention is in force,
whether waits and retries are consistent, whether the written conventions still
describe the code, and whether CI is wired the way the framework assumes. Every
finding is a **cross-file pattern**, invisible from inside a single test file,
which is what separates this from any review that opens one spec and argues about
a locator or an assertion.

Three neighbouring capabilities own adjacent ground. Do not duplicate them:

| Not owned | Where it belongs |
|---|---|
| What each object-model pattern **is**: the definition of Page Object, Screenplay, Component Object, App Actions, Service Object, Repository, Screen Object, their canonical citations, and their per-pattern anti-patterns | An object-model pattern catalog such as `object-model-patterns`. This audit cites that catalog's rules as the baseline it measures against; it does not restate what a Page Object is. |
| **Designing** a framework: choosing runner and language, laying out directories, deciding the fixture architecture, picking the object-model pattern, wiring test data and CI, writing the conventions doc | A framework design workflow such as `test-framework-blueprint`. That is the build side and it runs before any code exists. This is the audit side and it needs code to read. |
| The **suite's** health: how many tests sit in each tier, whether the pyramid is inverted, per-layer flake rate, defects caught per run-minute | A suite-level audit such as `test-suite-health-audit`. |

The last boundary is the one readers get wrong, because both are audits. Split
them on the **object being measured**: a suite audit counts **tests** and asks
whether there are the right number at each level (delete, move, quarantine);
this audit reads the **machinery the tests are written against** and asks whether
that machinery is sound (collapse a base class, split a fixture, delete a helper,
replace a sleep). A suite can be perfectly balanced and sit on a depth-five
hierarchy; a framework can be immaculate and carry three hundred redundant E2E
tests. Run both if you want the whole picture.

## Before scoring: what the baseline is

Two axes need a baseline the codebase cannot supply. **A1 needs the team's
object-model pattern**, because the coverage number means something different for
Page Object Model than for App Actions, where bypassing the UI during Arrange is
the point rather than a violation: take it from the conventions doc, or from what
the code predominantly does, and state which pattern you assumed. **A7 needs a
written conventions doc**, typically `docs/test-conventions.md`; without one it
emits `n/a`. Never substitute a generic convention set and then report the team
as drifted from a document they never wrote. That finding is unfalsifiable and
will be argued away, correctly.

## A1 - Page-object coverage, purity, and navigation return shape

Three sub-measurements, one band.

**Coverage.** The share of test files that reach the UI through an object model
rather than through inline selectors. The rule being measured: a page object
"wraps an HTML page, or fragment, with an application-specific API, allowing you
to manipulate page elements without digging around in the HTML"
([Fowler, PageObject](https://martinfowler.com/bliki/PageObject.html)), which
the official Selenium guidance states as "a clean separation between the test
code and page-specific code, such as locators"
([Selenium, Page Object Models](https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/)).
A test file holding raw locator strings has no such separation.

**Purity.** Object-model classes that assert are flagged. This one is grounded,
not conventional: Fowler records "differences of opinion on whether page objects
should include assertions themselves" and concludes "I favor having no assertions
in page objects"
([Fowler, PageObject](https://martinfowler.com/bliki/PageObject.html)), and
Selenium states it without hedging: "Page objects themselves should never make
verifications or assertions. This is part of your test and should always be
within the test's code, never in a page object"
([Selenium, Page Object Models](https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/)).
Selenium names one narrow exception: verifying the correct page loaded, done in
the constructor at instantiation. Do not flag that one.

**Navigation return shape.** An action that navigates must return the object for
the destination, not `void`. Fowler: "if you navigate to another page, the
initial page object should return another page object for the new page"
([Fowler, PageObject](https://martinfowler.com/bliki/PageObject.html)), and
Selenium gives the reason to keep it: methods returning other page objects make a
changed page relationship fail compilation, revealing the needed update without
running the tests
([Selenium, Page Object Models](https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/)).
A `void` navigation method throws that compile-time check away.

Also record the **object-to-page ratio** as evidence, not as a band: two objects
modelling one page is fragmentation and one object serving five pages is a
god-object, but neither is a hard threshold, because the canonical guidance is
deliberately loose. These objects "shouldn't usually be built for each page, but
rather for the significant elements on a page"
([Fowler, PageObject](https://martinfowler.com/bliki/PageObject.html)).

| Coverage | Band |
|---|---|
| 90% or above, zero asserting objects, zero `void` navigation methods | PASS |
| 70% to 90%, or any asserting object, or any `void` navigation method | WARN |
| Below 70% | FAIL |

**The 90% cut is a practitioner convention, not a published number.** Its
reasoning: full coverage is the wrong target because a handful of tests
legitimately probe raw DOM (a smoke test that the page rendered at all, a test
for the object model itself). One test file in ten is roughly the size of that
legitimate exception set in suites where the pattern is genuinely enforced. Below
70% the pattern is not enforced, it is optional, and an optional convention
produces two vocabularies in one repository. Purity and return shape are not
banded by percentage because both are binary rules with a cited source: one
violation is a finding.

## A2 - Base-class hierarchy depth

Walk the `extends` graph for every object-model class and every test base class.
Report the maximum depth per leaf.

| Max depth | Band |
|---|---|
| 2 or less (one shared base plus the specific class) | PASS |
| 3 | WARN |
| 4 or more | FAIL |

**The depth-2 limit is a practitioner convention.** No standard sets it. The
reasoning is blast radius, and it is arithmetic rather than taste: every class in
the chain is a place a change can originate, and every class below it is a place
that change can surface. At depth 2 a root edit has one intermediate hop to
reason about; at depth 4 it reaches leaf tests through three layers, each of
which may override, and the failing test names none of them. WARN rather than
FAIL at depth 3 because some products genuinely have a shared intermediate tier
(an authenticated-shell class between the generic base and the page). Depth 3
with a written justification in the conventions doc is a defensible exemption;
depth 4 with one is still a finding. The alternative is composition: mixins,
injected collaborators, or a shared component object give the same reuse without
the chain.

## A3 - Fixture scope and coupling

Classify every fixture by the scope it actually runs at, then check that the
scope matches what tests do to it.

The scope vocabulary is framework-specific and documented:

- Playwright has exactly two, test-scoped (torn down after each test) and
  worker-scoped (torn down when the worker process ends); fixtures are on-demand,
  so an unused one costs nothing and is not by itself a finding
  ([Playwright, Fixtures](https://playwright.dev/docs/test-fixtures)).
- pytest has five - `function` (default), `class`, `module`, `package`,
  `session` - where scope controls when the fixture is destroyed
  ([pytest, How to use fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html)).
- JUnit Jupiter's equivalent is the test instance lifecycle: per-method by
  default, while `@TestInstance(Lifecycle.PER_CLASS)` makes all methods share one
  instance, so a class-level cache field on a `PER_CLASS` class is shared mutable
  state between tests and belongs in this axis
  ([JUnit, Test Instance Lifecycle](https://docs.junit.org/current/writing-tests/test-instance-lifecycle.html)).

| Condition | Band |
|---|---|
| Every mutated fixture is per-test scoped; every broader-scoped fixture is read-only; no fixture module over 300 lines | PASS |
| One to three fixtures at a scope broader than per-test that tests mutate, or a fixture module of 300 to 500 lines | WARN |
| More than three mutated broad-scope fixtures, or a fixture module over 500 lines, or a session-scoped fixture mutated by tests that also run in parallel | FAIL |

**Both numeric cuts are conventions of this audit.** The scope semantics above
are documented; the counts are not. Reasoning for the count: one shared mutable
fixture is usually a single deliberate shortcut somebody can explain, while four
or more is a pattern, meaning the team has stopped treating scope as a decision
and new fixtures will inherit the habit. Reasoning for the 300-line cut: past a
few hundred lines a module has stopped being "the database fixture" and become
"the fixtures file", the point at which every test file transitively depends on
every fixture and the on-demand property above stops buying anything. Never
report either cut without the mutation evidence beside it: an 800-line module of
read-only fixtures is fine, and a 40-line module of shared mutable state is not.

## A4 - Helper sprawl

Two measurements: volume relative to the suite, and evidence of duplication or
death.

| Condition | Band |
|---|---|
| Helper files at 1:10 or fewer per test file, no name-family duplicates, no helper called from fewer than two test files | PASS |
| Ratio between 1:10 and 1:5, or a name family of three or more overlapping helpers, or any dead-candidate helper | WARN |
| Ratio worse than 1:5, or helper modules that import each other in a cycle | FAIL |

**The 1:10 ratio is a practitioner convention.** Reasoning: a helper earns its
existence by being called from several places, so in a healthy suite the helper
count grows far more slowly than the test-file count. When the two converge,
helpers are being written per-test, which is the duplication the helper layer was
supposed to remove, now with an extra indirection. One in ten still looks like
shared infrastructure; one in five looks like a second copy of the suite.

**Name families** are the duplication tell: `http-helper`, `api-helper`,
`request-helper`, and `client-helper` in one directory almost always hold three
implementations of the same wrapper by people who did not find each other's.
Report the family and its members, not just the count.

**Dead candidates** are helpers with fewer than two call sites across a fixed
recent window; state the window in the output. A helper exercised once per
release cycle looks dead in a 90-day window and is not, so the output word is
**candidate**: the team confirms, the audit does not delete. An import cycle
between helper modules is FAIL on its own regardless of counts, because a layer
with no direction makes every helper transitively reachable from every other and
defeats any attempt to prune one.

## A5 - Naming-convention drift

Check four dimensions independently. For each, compute the adoption share of
every pattern present:

| Dimension | Competing patterns look like |
|---|---|
| Test file suffix | `*.spec.ts` vs `*.test.ts` vs `*_test.ts` |
| Element-targeting attribute | `data-testid` vs ARIA role and label vs CSS class |
| Object-model method naming | `clickAddToCart()` vs `add_to_cart()` vs `tapAddToCart()` |
| Suite-block phrasing | `describe('Cart')` vs `describe('cart functionality')` vs `describe('CartPage tests')` |

A dimension counts as **drifted** when two or more patterns each hold **20% or
more** adoption. A pattern under 20% is reported as a hygiene note, not as drift.

| Drifted dimensions | Band |
|---|---|
| 0 | PASS |
| 1 or 2 | WARN |
| 3 or 4 | FAIL |

**The 20% adoption cut is a convention of this audit.** Reasoning: the
distinction worth reporting is between a leftover and a competing convention. A
pattern holding a few percent is residue, usually an unfinished migration or one
contributor, and calling it drift generates a finding whose fix is a rename
nobody disagreed about. At one file in five, a new engineer reading the codebase
cannot tell which convention is in force, and that ambiguity is the actual cost
being measured. Set the cut lower if the team is mid-migration and wants residue
tracked; keep it fixed across audits either way, so consecutive reports compare.

The element-targeting patterns are not equally good, and published guidance
exists: Cypress names "using highly brittle selectors that are subject to change"
an anti-pattern and recommends `data-*` attributes
([Cypress, Best Practices](https://docs.cypress.io/app/core-concepts/best-practices)),
while Playwright recommends "prioritizing user-facing attributes and explicit
contracts"
([Playwright, Best Practices](https://playwright.dev/docs/best-practices)). This
axis measures **consistency** only; which target to standardize on is a per-file
review's concern.

## A6 - Retry and wait consistency

Four checks, one band. This axis usually carries the largest blast radius in the
whole audit, because everything it flags produces intermittent failures today.

**Fixed-duration sleeps.** Every wait for a wall-clock duration
(`page.waitForTimeout(...)`, `cy.wait(2000)`, a bare `setTimeout` in setup) is a
finding, which is the framework authors' own position: Cypress lists "waiting for
arbitrary time periods using `cy.wait(Number)`" as an anti-pattern and prescribes
"route aliases or assertions to guard Cypress from proceeding until an explicit
condition is met"
([Cypress, Best Practices](https://docs.cypress.io/app/core-concepts/best-practices)),
and Playwright's replacement is the web-first assertion: "By using web first
assertions Playwright will wait until the expected condition is met"
([Playwright, Best Practices](https://playwright.dev/docs/best-practices)).
Always print the idiomatic replacement next to each instance. A finding that says
only "remove the sleep" gets fixed as
`await new Promise(r => setTimeout(r, 2000))`: the same defect in new syntax.

**Non-waiting assertion forms.** An assertion that resolves the value first and
then asserts on the result (`expect(await locator.isVisible()).toBe(true)`) does
not retry, while the auto-waiting form (`await expect(locator).toBeVisible()`)
does. Both compile; only one waits.

**Timeout spread.** Count the distinct explicit timeout values. Three or more
means nobody owns the timeout policy, and the next engineer will add a fourth.

**Retry contradictions.** A config-level retry setting that individual files or
projects override in the opposite direction is a finding regardless of values.
With retries on, "failing tests will be retried multiple times until they pass,
or until the maximum number of retries is reached", and a test that failed then
passed is reported under the distinct outcome "flaky"
([Playwright, Test retries](https://playwright.dev/docs/test-retries)), so a file
that opts out silently reclassifies its own flakes as failures.

| Condition | Band |
|---|---|
| No fixed-duration sleeps, no non-waiting assertion forms, fewer than three distinct timeouts, no retry contradiction | PASS |
| 1 to 5 sleeps, or 3 or more distinct timeouts, or any non-waiting assertion form | WARN |
| More than 5 sleeps, or any retry contradiction between config and files | FAIL |

**The sleep counts are conventions of this audit.** That sleeps are defects is
sourced above; how many make it a framework-level finding is not. Reasoning: a
handful is a per-file problem a per-file review catches, but past that sleeps are
the framework's de facto wait strategy, fixing them one at a time will not stop
new ones appearing, and the remediation changes to a lint rule plus a documented
replacement pattern.

## A7 - Documented-versus-actual convention drift

Read the team's conventions doc, turn each rule it states into a measurement,
then measure. This is the only axis whose baseline comes from the team rather
than from this audit, and it is the one teams find most persuasive, because the
standard being applied is their own.

| Documented rule | What to measure |
|---|---|
| "Always use role-based locators" | Share of element lookups using the role-based API |
| "Tests follow Arrange-Act-Assert" | Share of sampled test bodies with a single Act phase and no interleaved assertions |
| "Object models are mandatory for E2E" | The A1 coverage figure |
| "Fixtures must be per-test" | The A3 scope distribution |
| "One assertion concern per test" | Share of tests asserting on more than one behavior |

A rule counts as **drifted** at below 80% measured adoption.

| Condition | Band |
|---|---|
| No documented rule below 80% | PASS |
| At least one rule between 50% and 80% | WARN |
| Any rule below 50% | FAIL |
| No conventions doc exists | `n/a`, stated explicitly |

**Both cuts are conventions of this audit.** Reasoning for 80%: a written rule
with one exception in five is still recognisably the rule, and the fix is a
cleanup. Reasoning for 50%: below half, the document no longer describes what the
codebase does. That is not drift, it is fiction, and the remediation may be to
change the document rather than the code. Say which you recommend. An abandoned
conventions doc is worse than none: it is what new engineers read on day one.

## A8 - CI integration health

Six patterns to look for, each grounded in the tooling's own documentation, plus
explicit anti-patterns.

| Pattern | What good looks like |
|---|---|
| **Parallel sharding** | The suite splits across machines. Playwright's mechanism is `--shard=x/y`: "to split the suite into four shards, each running one fourth of the tests", and "if you run these shards in parallel on different jobs, your test suite completes four times faster" ([Playwright, Sharding](https://playwright.dev/docs/test-sharding)) |
| **Merged reporting across shards** | Sharded runs produce one report, not N. Playwright merges shard output with `npx playwright merge-reports` to "produce a standard HTML report" ([Playwright, Sharding](https://playwright.dev/docs/test-sharding)) |
| **Machine-readable results** | A JUnit-style XML artifact CI can ingest: `reporter: [['junit', { outputFile: 'results.xml' }]]` ([Playwright, Reporters](https://playwright.dev/docs/test-reporters)) |
| **Debug artifacts on retry only** | Traces captured when a test is retried rather than on every green run: "'on-first-retry' - Record a trace only when retrying a test for the first time", and traces "should be run on continuous integration on the first retry of a failed test" ([Playwright, Trace viewer](https://playwright.dev/docs/trace-viewer)) |
| **An explicit retry policy** | Retries are set deliberately and in one place. "By default failing tests are not retried" ([Playwright, Test retries](https://playwright.dev/docs/test-retries)), so silence in the config is itself a policy and should be a chosen one |
| **Secrets from the CI secret store** | Credentials injected at run time, not committed. On GitHub Actions: "you can use the `secrets` context to access secrets you've created in your repository" ([GitHub, Use secrets in workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)) |

| Condition | Band |
|---|---|
| All six present, no anti-pattern | PASS |
| One or two missing | WARN |
| Three or more missing, or any anti-pattern below | FAIL |

Anti-patterns that force FAIL on their own:

- **A high retry count used as a flake suppressant.** The cut used here, more
  than 2, is a convention of this audit rather than a documented limit: past two
  attempts the run stops distinguishing an infrastructure blip from a real
  intermittent defect, and the "flaky" outcome the runner reports
  ([Playwright, Test retries](https://playwright.dev/docs/test-retries)) becomes
  the normal outcome rather than a signal.
- **Credentials committed to the repository**, including a `.env.test` file. A
  secret in git is a secret regardless of which branch it is on.
- **A fixed sleep in CI setup or a global setup hook.** Same defect as A6,
  amplified: it pays its cost on every shard of every run.

## Rolling the eight axes into one report

Any FAIL makes the verdict FAIL, otherwise any WARN makes it WARN, otherwise
PASS. This rollup is a convention and deliberately unweighted, because what
matters is not the verdict but the fix order. Rank recommendations by **blast
radius**, not by axis number:

1. **A6** when it fails: its findings produce intermittent failures today, each
   costing somebody a re-run this week.
2. **A2**: deep hierarchies make every other fix more expensive, so collapsing
   them early lowers the cost of the rest.
3. **A1, A3**: structural, but the pain is spread over months.
4. **A8**: usually cheap, and often removes A6 symptoms downstream.
5. **A4, A5, A7**: hygiene. Nothing breaks if they wait a quarter.

## Output format

Emit one Markdown block, in this order.

```markdown
## Framework architecture audit: <PASS | WARN | FAIL>

**Framework:** <runner + language>   **Object model assumed:** <pattern> (<from the conventions doc | inferred from the code>)
**Inventory:** <n> test files, <n> object-model classes, <n> fixtures, <n> helper modules
**Call-site window:** <the fixed recent window used for A4 dead candidates>

| Axis | Measured | Band | Top finding |
|---|---|---|---|
| A1 Object-model coverage / purity / return shape | <n>% / <n> asserting / <n> void-nav | <band> | <one line> |
| A2 Base-class depth | max <n> | <band> | <the chain, root to leaf> |
| A3 Fixture scope | <n> mutated broad-scope, largest module <n> lines | <band> | <one line> |
| A4 Helper sprawl | 1:<n>, <n> dead candidates | <band> | <the name family, if any> |
| A5 Naming drift | <n> of 4 dimensions drifted | <band> | <dimension + shares> |
| A6 Retry / wait | <n> sleeps, <n> distinct timeouts | <band> | <one line> |
| A7 Convention drift | <n> of <n> documented rules drifted | <band or n/a> | <rule + measured %> |
| A8 CI integration | <n> of 6 patterns present | <band> | <one line> |

## Detail: <one subsection per FAIL axis>

<Evidence at file:line. For A2 print the full extends chain; for A6 a file / line
/ pattern / idiomatic-replacement table; for A7 documented rule against measured
adoption.>

## Fix order (by blast radius)

1. <axis> (<band>) - <what to do> - <who owns it>

## Conventions applied, not standards

<Every band whose cut is a convention of this audit, with the value used: the A1
90% coverage cut, the A2 depth limit, the A3 fixture counts and 300-line module
cut, the A4 1:10 ratio, the A5 20% adoption cut, the A6 sleep counts, the A7 80%
and 50% cuts, the A8 retry-count cut. A reader who disagrees must see the cut.>

## Not covered here

- Per-file review of assertions, selectors, mocking technique, and test naming.
- Suite tier mix, flake rate, and per-tier return. Different object of measurement.
- Any change to the framework. This audit reads; the team decides and refactors.
```

Keep the conventions section even when it lengthens the report: every cut here is
arguable, and a band printed without its threshold gets quoted later as if a
standard produced it.

## Worked example and anti-patterns

A full worked audit (a Playwright + TypeScript framework scored across all eight
axes with the fix order derived) and the anti-pattern table for running this
audit live in [references/audit-detail.md](references/audit-detail.md).

## Limitations

- **Static, not runtime.** Every axis reads code; none observe a run. A6 finds
  the sleeps but cannot say which cause the flakes you are seeing, and A4's dead
  candidates are candidates because absence of a call site is not absence of a
  caller.
- **The purity check is shallow.** A1 catches assertions written directly in an
  object-model class. A method that calls a helper that asserts passes the check
  while breaking the rule.
- **Framework coverage is uneven.** The waiting, retry, sharding, and reporting
  patterns are documented in detail for a handful of mainstream runners, as the
  citations show; other runners fall back to generic heuristics with less
  confidence. Say which runner you audited.
- **Percentages count files, not tests.** One file holding thirty scenarios
  weighs the same as one holding a single test. Count cases where the runner
  exposes them, and state which you used.
- **One repository per run, and no effort estimate.** A monorepo's test
  directories walk together, but a separate test-only repository is a separate
  audit. The fix order ranks by blast radius; what each fix costs depends on team
  familiarity with the code.
- **Every axis is a proxy, and a framework can pass all eight and still be
  unpleasant to work in.** These measurements catch structural debt visible in
  file shapes and counts. They do not catch abstractions that are named wrong,
  failure messages that say nothing useful, a local run that takes forty minutes,
  or fixtures that are correct and incomprehensible. If the team says the
  framework is painful and all eight axes band PASS, the axes are wrong for that
  team, not the team. Record the disagreement instead of defending the report.

## Sources

Each is cited inline above at the claim it supports; this is the index only.

- [Fowler, PageObject](https://martinfowler.com/bliki/PageObject.html) - A1 purity, navigation return shape, object-to-page granularity.
- [Selenium, Page Object Models](https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/) - A1 separation rule, no-assertions rule and its one exception, the compile-time benefit.
- [pytest, How to use fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html) - A3 five scopes and their destruction points.
- [JUnit, Test Instance Lifecycle](https://docs.junit.org/current/writing-tests/test-instance-lifecycle.html) - A3 per-method default, `PER_CLASS` shared instance.
- [Cypress, Best Practices](https://docs.cypress.io/app/core-concepts/best-practices) - A5 selector guidance, A6 arbitrary-wait anti-pattern.
- [GitHub, Use secrets in workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets) - A8 secret store.
- Playwright docs: [Fixtures](https://playwright.dev/docs/test-fixtures) (A3 test versus worker scope, on-demand setup), [Best Practices](https://playwright.dev/docs/best-practices) (A5 user-facing attributes, A6 web-first assertions), [Test retries](https://playwright.dev/docs/test-retries) (A6 and A8 retry policy, the "flaky" outcome), [Trace viewer](https://playwright.dev/docs/trace-viewer) (A8 `on-first-retry` capture), [Sharding](https://playwright.dev/docs/test-sharding) (A8 `--shard=x/y` and merged reports), [Reporters](https://playwright.dev/docs/test-reporters) (A8 JUnit XML output).
