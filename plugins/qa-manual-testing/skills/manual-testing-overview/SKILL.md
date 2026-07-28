---
name: manual-testing-overview
description: "Teaches human-driven testing end to end: when a predefined scripted test case is the right instrument versus a time-boxed exploratory session, how session-based test management works (charter with a stated mission, time box, session notes, debrief) with a worked charter and a filled-in session sheet, a decision rule for what to automate versus what to keep human, and what makes a manual bug report actionable (exact reproduction steps, observed versus expected, build and environment, evidence). Use when planning or running testing a person performs by hand, writing a charter for an exploratory session, deciding whether a check belongs in an automated suite or in a human session, or fixing bug reports that developers keep returning as not reproducible."
---

# manual-testing-overview

Human-driven testing is testing a person performs by operating the product, deciding
what to try next, and judging what they see. It has exactly two modes, and most teams
get into trouble by running one when they needed the other.

## The two modes

|  | Scripted manual testing | Exploratory testing |
|---|---|---|
| Designed | Before execution, by someone else | During execution, by the person running it |
| Fixed in advance | Steps, data, expected result | A mission and a time box only |
| Executor's job | Execute and observe, not design | Learn, design and execute at once |
| Output | Pass/fail per case, signed and dated | Session notes, bugs, issues, new charters |
| Repeatable by a stranger | Yes, that is the point | No, and that is not the point |
| Finds | Deviations from what was anticipated | What nobody thought to anticipate |

Exploratory testing is not "clicking around". ISTQB defines it as testing where "tests
are simultaneously designed, executed, and evaluated while the tester learns about the
test object", and notes it is "useful when there are few or inadequate specifications or
there is significant time pressure" and to "complement other more formal test techniques"
([ISTQB CTFL Syllabus v4.0.1 §4.4.2, p.44](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)).
A scripted manual test case, by contrast, is written to be re-run: it contains
"the necessary preconditions (if any), the inputs, and the postconditions", expressed so
that stakeholders can read it (same syllabus, p.46).

### Which mode a given piece of work needs

Decide on facts you can observe about the work in front of you, not on preference.

| Observable fact | Mode |
|---|---|
| An auditor, regulator or customer will ask "who verified this, on what build, and what exactly did they do?" | Scripted. The signed step table is the artifact they want |
| The behavior is specified in writing and the spec is stable | Scripted, then automate it (see below) |
| Non-technical business stakeholders must sign the result off | Scripted, in business language, with an acceptance-criteria block |
| There is no spec, or the spec is a paragraph in a ticket | Exploratory. You cannot script what nobody has described |
| The feature shipped last week and nobody has used it in anger | Exploratory |
| A previous incident came from an interaction nobody modeled | Exploratory, chartered at that interaction |
| You are re-running the same 40 steps every release by hand | Neither. That is automation debt, not a testing strategy |

Both belong in a mature strategy. Scripted passes give stakeholders a repeatable, signed
record; exploratory sessions find the class of bug a pre-written script structurally
cannot contain, because whoever wrote the script did not know the bug existed.

### What a scripted case looks like

Concrete enough that someone who has never seen the feature can run it and reach the
same verdict you would. Preconditions, inputs, postconditions, one scenario per case
(CTFL v4.0.1, p.46).

```
TC-CHK-014  Expired promo code is rejected at checkout
Build/env   web 4.18.2-rc3, staging-eu    Data  code EXPIRED22 (expiry 2025-12-31)
Precondition  Signed in as qa-buyer-04, cart = 3x SKU-1188, subtotal EUR 120.00

# | Step                                  | Expected result
1 | Open /checkout                        | Order summary shows total EUR 120.00
2 | Type EXPIRED22 into Promo code        | Apply button becomes enabled
3 | Click Apply                           | Inline error "This code has expired";
  |                                       | total unchanged at EUR 120.00
4 | Click Place order                     | Order is created; confirmation shows
  |                                       | no discount line

Actual | Pass/Fail | Tester | Date | Notes
```

Step 3 is the case: it states one observable outcome, not "check the code is handled".
A step whose expected result needs judgement belongs in a charter instead.

## Session-based test management: the structure that makes exploration reviewable

Jonathan and James Bach developed session-based test management (SBTM) at Hewlett-Packard
in 2000. Its core move is to make the **session**, not the test case or the bug report, the
unit of work: "an uninterrupted block of reviewable, chartered test effort", where
chartered means each session carries a mission and reviewable means it produces a session
sheet a third party such as the test manager can examine
([Bach, Jonathan, *Session-Based Test Management*, STQE Nov/Dec 2000, p.33](https://www.satisfice.com/download/session-based-test-management)).

Four parts, all four required:

1. **A charter with an explicit mission.** What you are testing, or what problems you
   are looking for. A common charter form is "Explore (target) with (resources) to
   discover (information)", from Elisabeth Hendrickson's *Explore It!* chapter
   "Charter Your Explorations" ([Pragmatic Bookshelf, 2013](https://pragprog.com/titles/ehxta/explore-it/)).
2. **A time box.** In the original practice sessions ran "ninety minutes, give or take";
   about 45 minutes is called a short session, about two hours a long session, and a
   tester is expected to complete roughly three sessions on a typical day
   ([Bach 2000, p.33](https://www.satisfice.com/download/session-based-test-management)).
   Those figures are one team's practice, not a standard: treat 60 to 90 minutes as the
   working default and adjust once you have your own data.
3. **Session notes.** The report sections in the original are: session charter (mission
   plus areas), tester name(s), date and time started, task breakdown, data files, test
   notes, issues, bugs (Bach 2000, p.34, same PDF). Bugs are concerns about the product;
   issues are questions or problems about the test process or project.
4. **A debrief.** A short discussion where the lead's primary objective is "to understand
   and accept the session report", and a secondary objective is to coach the tester
   (Bach 2000, p.33, same PDF). ISTQB describes the same shape: a time box, a test
   charter containing test objectives, and a debriefing with stakeholders afterwards
   ([CTFL v4.0.1 §4.4.2, p.44](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)).

The task breakdown is the part people skip and the part that pays. Estimate the session's
time as percentages across three buckets, the TBS metrics: **test design and execution**
(scanning the product for problems), **bug investigation and reporting** (once you hit
something that looks wrong), **session setup** (configuring equipment, locating materials,
reading manuals, writing the report) (Bach 2000, p.34, same PDF). A session that is 60%
setup is telling you the environment is broken, not that the tester is slow.

## A worked charter and session sheet

Not a template with blanks. This is what a finished sheet looks like for a real feature:
a promo-code field added to checkout last sprint, with no written spec beyond the ticket.

```
CHARTER
Explore promo-code entry at checkout with expired, stacked, and case-varied
codes to discover incorrect order totals.

#AREAS
Product   | Checkout
Function  | Promo code apply/remove
Data      | Expired codes, single-use codes, mixed-case codes
Strategy  | Function testing, boundary probing
Build     | web 4.18.2-rc3, staging-eu

START
2026-07-14 09:40

TESTER
R. Okonjo

TASK BREAKDOWN
#DURATION   normal (90 min)
#TEST DESIGN AND EXECUTION   55%
#BUG INVESTIGATION AND REPORTING   30%
#SETUP   15%
#CHARTER VS OPPORTUNITY   85/15

TEST NOTES
Applied SAVE10 (10% off, valid) to a 3-item cart: total correct.
Applied SAVE10 twice: second apply accepted, discount taken twice.
That is BUG-1. Removing one instance restored the correct total, so
the defect is in apply, not in the total calculation.
Varied case: save10, Save10, SAVE10 all accepted as the same code.
Expired code EXPIRED22: rejected with a clear message. Good.
Single-use code reused on a second order in the session: rejected.
Off charter (15%): the cart shows the pre-discount total for about
400 ms after apply before it repaints. Logged as ISSUE-1 because I
could not tell whether it is intended.

BUGS
BUG-1  Same promo code can be applied twice, discounting the order
       twice. Repro in report; blocks release.

ISSUES
ISSUE-1  No spec exists for whether case-insensitive codes are
         intended. Need a decision from product before I can call it.
ISSUE-2  Staging emails do not send, so I could not verify the
         discount shown in the order-confirmation email.
```

Note what the charter does: it names a target (promo-code entry at checkout), the resources
brought to it (three data classes), and the information wanted (incorrect order totals).
"Test checkout" would not have produced this session.

## Running the debrief

Debrief against the report, not against the tester's memory. James Bach's session report
checklist gives the questions worth asking; these are the ones that catch the most
([Bach, James, *Test Session Debrief Checklist*, Satisfice, 2021](https://www.satisfice.com/download/sbtm-session-report-checklist)):

- Does the text of the charter match the bulk of the testing actually done? If not,
  change the charter to match, or split it into more sessions.
- Was the charter fulfilled? If not, document what is left, or reduce the scope.
- Is the stated duration accurate to within about 20%, and does it exclude interruptions?
- Do the test notes answer "what happened in this session?" and will the tester still
  understand them three months from now?
- Are bugs and issues both reported? If there are no issues at all, was there really no
  confusion, no open question, and no obstacle?
- Do the results suggest another session? That answer is the next charter.

If a tester cannot make progress on a charter at all, the standing order in the original
practice is to abort the session and run a different one rather than burn the time
([Bach 2000, p.35](https://www.satisfice.com/download/session-based-test-management)).

## What to automate and what to keep human

The line is not "manual is cheap" versus "automation is modern". It is whether the check is
deterministic and repeated, or a judgement made once. Deterministic, repeated work -
regression suites, component and component-integration checks in CI, smoke and
non-functional checks other than usability - is a strong automation candidate. Judgement
work - exploratory, usability, and user-acceptance testing, and visual/aesthetic "does this
read as broken?" calls - stays human, though a tool may flag candidates for a human verdict.
The full per-row table with CTFL citations (pp.29-30, §5.1.7 Q1/Q3/Q4 p.51, §6.2 p.60) is in
[references/automation-decisions.md](references/automation-decisions.md).

Two failure modes sit at the ends. Keeping a deterministic regression pass manual means
paying for it again every release, with attention that degrades on the fortieth repetition.
Automating everything hits the named automation risk: "relying on a tool too much, e.g.,
ignoring the need of human critical thinking" (CTFL v4.0.1 §6.2, p.60).

## Writing a bug report that gets fixed

A bug report exists to give whoever fixes it "sufficient information to resolve the issue"
([CTFL v4.0.1 §5.5, pp.56-57](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)).
ISTQB enumerates the full field list a logged report should carry, and ISO/IEC/IEEE
29119-3 carries the same as incident-report templates - the complete field list and the
FEW HICCUPPS oracle set are in
[references/bug-report-and-oracles.md](references/bug-report-and-oracles.md). Four fields
carry nearly all the weight:

```
Title      Promo code SAVE10 applies twice, discounting the order twice

Env        web 4.18.2-rc3, staging-eu, Chrome 138, macOS 15.5
           Account: qa-buyer-04. Cart: 3x SKU-1188, subtotal EUR 120.00

Steps      1. Add 3x SKU-1188 to the cart, go to /checkout
           2. Enter SAVE10 in Promo code, click Apply
           3. Enter SAVE10 again in the same field, click Apply

Observed   Second apply is accepted. Order total drops to EUR 97.20.
           Two "SAVE10 -10%" rows are shown in the summary.

Expected   Second apply is rejected with "This code is already applied".
           Order total stays at EUR 108.00.

Evidence   screenshot-checkout-double-discount.png, HAR of the second
           POST /api/cart/promo (returns 200, applied: true)

Repro      3 of 3 attempts. Also reproduces with SAVE20.
```

"Observed versus expected" is the field people collapse, and collapsing it is what makes a
report bounce back: "it doesn't work" states neither. When you are unsure something is even
a defect, name the expectation it violates - inconsistency with history, claims, comparable
products, users' desires, the product itself, its purpose, or standards each gives a
concrete reason to argue the bug
([Bolton M., "FEW HICCUPPS", DevelopSense, 2012](https://developsense.com/blog/2012/07/few-hiccupps)).

## Traps that catch newcomers first

- **A charter the size of a feature.** "Test checkout" is a backlog item, not a mission.
  If the charter is larger than a session can cover, reduce its scope in the debrief or
  create more sessions with the same charter (Bach 2000, p.35).
- **Counting interrupted time as session time.** A session is uninterrupted by definition;
  time lost to a meeting or a Slack thread does not belong in the duration (Satisfice
  debrief checklist).
- **Notes only the author can read.** Write for yourself three months from now, because
  that is who will need them.
- **Filing every observation as a bug.** Things wrong with the product are bugs. Things
  that impaired your ability to test (missing data, broken staging email, no spec) are
  issues, and they get lost if you file them as bugs.
- **A scripted step that says "verify the page looks correct".** A case must be executable
  by someone who did not write it: concrete preconditions, inputs and postconditions
  (CTFL v4.0.1, p.46).
- **Treating a manual regression pass as permanent.** Every release it survives, it gets
  longer and more skipped. Move each deterministic case into an automated suite as the
  behavior stabilizes.

## Further reading

This skill's own bundled references:
[references/automation-decisions.md](references/automation-decisions.md)
(full automate-vs-human table) and
[references/bug-report-and-oracles.md](references/bug-report-and-oracles.md)
(full defect-report field list and oracle set).

If they are installed alongside this one, these go deeper on individual pieces above:
`session-based-test-management-reference`
(session sheet and metrics in full), `manual-test-debrief`,
`exploratory-tours-reference` (steering a
drifting session), `hiccupps-f-heuristic` (oracles),
and `manual-test-script-author` plus
`uat-script-author` for the scripted side.
