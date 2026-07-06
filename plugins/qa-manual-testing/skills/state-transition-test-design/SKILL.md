---
name: state-transition-test-design
description: "Derives human-readable manual test cases from stateful behavior: identify states, events, transitions, and guard conditions, draw the state table including invalid (empty-cell) transitions, choose a coverage level (all states, valid transitions / 0-switch, transition pairs / 1-switch per Chow, all transitions including invalid ones), then derive one test case per coverage item as an event sequence with per-step expected states (ISTQB CTFL v4.0 section 4.2.4). Deep single-technique walkthrough, unlike test-case-ideation-from-story in qa-process (broad multi-lens case matrix); output is manual step/expected cases, unlike boundary-value-generator in qa-test-data (parameterized test code); covers derivation, not case field structure like test-case-anatomy-reference in qa-test-management. Use for lifecycle entities (accounts, orders, subscriptions), workflows, and UI wizards where the response to an event depends on the current state."
keywords: ["state transition", "state machine", "state table", "test design", "istqb", "ctfl", "n-switch", "chow", "manual testing"]
---

# state-transition-test-design

## Overview

Per [ISTQB CTFL Syllabus v4.0.1 §4.2.4](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf),
"a state diagram models the behavior of a system by showing its possible
states and valid state transitions. A transition is initiated by an
event, which may be additionally qualified by a guard condition." This
skill walks the derivation end to end: stateful spec in, human-readable
manual test cases out (event sequences with per-step expected states,
not code).

CTFL claims below come from the official v4.0.1 PDF (2024-09-15) fetched
from istqb.org on 2026-06-10; the N-switch material comes from the
[CTAL-TA v4.0 syllabus §3.2.2](https://astqb.org/assets/documents/ISTQB-CTAL-TA-Syllabus-v4.0-EN-4.pdf)
(fetched 2026-06-10). One worked example (account lockout) is carried
through every step.

## When to use

State transition testing fits wherever "the reaction of the system to an
event depends on the current state of the system" - the CTAL-TA syllabus
names "embedded systems, dialog-based systems, control systems, or
systems that deal with entities and their lifecycles" as canonical
stateful systems
([CTAL-TA v4.0 §3.2.2](https://astqb.org/assets/documents/ISTQB-CTAL-TA-Syllabus-v4.0-EN-4.pdf)).
In web/product QA that means:

- **Lifecycle entities**: accounts, orders, subscriptions, tickets,
  documents with draft/review/published states.
- **Workflows**: approval chains, payment flows, onboarding.
- **UI wizards**: multi-step forms where back/skip/cancel behavior
  depends on the current step.

If behavior is stateless rule logic (same input always gives the same
output), use
[`decision-table-test-design`](../decision-table-test-design/SKILL.md)
instead. For a broad multi-lens first pass over a story, use
[`test-case-ideation-from-story`](../../../qa-process/skills/test-case-ideation-from-story/SKILL.md);
this skill is the deep walkthrough of one technique.

## Worked example spec (used in every step)

> **Account lockout.** An Active account locks after the 3rd consecutive
> failed login (a lockout email is sent); a successful login resets the
> failure counter. An admin can unlock a Locked account (counter resets),
> suspend an Active account, reinstate a Suspended account, and close an
> Active, Locked, or Suspended account. Closed is terminal. Locked and
> Suspended accounts reject all logins.

## Step 1 - Identify states, events, transitions, guards

§4.2.4 gives the transition labeling syntax `event [guard condition] / action`,
where "guard conditions and actions can be omitted if they do not exist
or are irrelevant for the tester"
([CTFL v4.0.1](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)).

**States (4):** Active, Locked, Suspended, Closed.

**Events (6, counting guarded variants separately):** `login-success`,
`login-fail [fails < 3]`, `login-fail [3rd consecutive]`, `admin-unlock`,
`admin-suspend`, `admin-close`. The same raw event (`login-fail`) splits
into two columns because its guard changes the target state; per §4.2.4
the table columns are "events (together with guard conditions if they
exist)".

**Valid transitions (9):**

| ID | From | Label | To |
|---|---|---|---|
| t1 | Active | `login-success / reset fail counter` | Active |
| t2 | Active | `login-fail [fails < 3] / increment counter` | Active |
| t3 | Active | `login-fail [3rd consecutive] / send lockout email` | Locked |
| t4 | Active | `admin-suspend` | Suspended |
| t5 | Active | `admin-close` | Closed |
| t6 | Locked | `admin-unlock / reset fail counter` | Active |
| t7 | Locked | `admin-close` | Closed |
| t8 | Suspended | `admin-unlock` | Active |
| t9 | Suspended | `admin-close` | Closed |

This table doubles as the state *diagram* in markdown form: every row is
one labeled arrow.

## Step 2 - Draw the state table (states x events, invalid cells included)

Per §4.2.4, "a state table is a model equivalent to a state diagram. Its
rows represent states, and its columns represent events... Table entries
(cells) represent transitions, and contain the target state, as well as
the resulting actions, if defined. In contrast to the state diagram, the
state table explicitly shows invalid transitions, which are represented
by empty cells"
([CTFL v4.0.1](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)).

Empty cells are marked `--` below for readability:

| State \ Event | login-success | login-fail [fails < 3] | login-fail [3rd] | admin-unlock | admin-suspend | admin-close |
|---|---|---|---|---|---|---|
| **Active** | Active / reset (t1) | Active / increment (t2) | Locked / email (t3) | -- | Suspended (t4) | Closed (t5) |
| **Locked** | -- | -- | -- | Active / reset (t6) | -- | Closed (t7) |
| **Suspended** | -- | -- | -- | Active (t8) | -- | Closed (t9) |
| **Closed** | -- | -- | -- | -- | -- | -- |

Count: 4 states x 6 event columns = 24 cells; 9 valid transitions, 15
invalid. "Invalid" means the model defines no state change for that
event in that state, not that the event cannot physically arrive: a user
*can* type correct credentials into a Locked account (row Locked, column
login-success); the system must reject the login and stay Locked. Those
cells are exactly where lockout-bypass bugs live.

## Step 3 - Choose the coverage level

§4.2.4 defines three criteria
([CTFL v4.0.1](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)):

| Level | Coverage items | 100% means | Here |
|---|---|---|---|
| All states | The states | Every state exercised | 4 items |
| Valid transitions (0-switch) | Single valid transitions | Every valid transition exercised | 9 items |
| All transitions | All cells of the state table | All valid exercised + all invalid attempted | 24 items |

Per the same section: "all states coverage is weaker than valid
transitions coverage", "valid transitions coverage is the most widely
used coverage criterion" and guarantees all states coverage, and "all
transitions coverage... should be a minimum requirement for mission and
safety-critical software." Coverage for each is the exercised (or
attempted) items divided by total items, as a percentage.

**Transition pairs (1-switch, Chow).** Beyond CTFL, "N-switch coverage
applies to valid sequences of N+1 consecutive transitions, also called
N-switches (Chow, 1978). 0-switch coverage equals the valid transitions
coverage... A 1-switch is a pair of incoming and outgoing transitions at
a state. 0- and 1-switch coverage are frequently used in practice"; 100%
2-switch or higher "is only indicated for a high risk of failure due to
unexpected sequences of events, as the number of N-switches can grow
exponentially with N"
([CTAL-TA v4.0 §3.2.2](https://astqb.org/assets/documents/ISTQB-CTAL-TA-Syllabus-v4.0-EN-4.pdf)).

Practical default: valid-transitions (0-switch) coverage plus targeted
invalid-transition tests for the security/abuse-relevant empty cells;
escalate to 1-switch pairs around states whose exit behavior depends on
how they were entered.

## Step 4 - Derive test cases (valid-transitions coverage)

Per §4.2.4, "a test case based on a state diagram or state table is
usually represented as a sequence of events" and "one test case may, and
usually will, cover several transitions between states"
([CTFL v4.0.1](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)).
Three event sequences cover all 9 valid transitions (9/9 = 100%
valid-transitions coverage):

**TC-ST-1 (covers t1, t2, t3, t6, t4, t9).** Precondition: Active
account, failure counter 0, valid + invalid passwords known.

| # | Action | Expected result |
|---|---|---|
| 1 | Log in with the correct password | Login succeeds; account Active (t1) |
| 2 | Log out, then attempt login with a wrong password | Login rejected; account still Active (t2) |
| 3 | Attempt login with a wrong password again | Login rejected; account still Active (t2) |
| 4 | Attempt login with a wrong password a 3rd consecutive time | Login rejected; account shows Locked in admin panel; lockout email received (t3) |
| 5 | As admin, unlock the account | Account Active (t6) |
| 6 | As admin, suspend the account | Account Suspended (t4) |
| 7 | As admin, close the account | Account Closed (t9) |

**TC-ST-2 (covers t7).** Precondition: Active account, counter 0.

| # | Action | Expected result |
|---|---|---|
| 1 | Attempt login with a wrong password 3 times | Account Locked; lockout email received |
| 2 | As admin, close the locked account | Account Closed (t7) |

**TC-ST-3 (covers t8, t5).** Preconditions: two Active accounts.

| # | Action | Expected result |
|---|---|---|
| 1 | As admin, suspend account A | Account A Suspended |
| 2 | As admin, reinstate (unlock) account A | Account A Active (t8) |
| 3 | As admin, close account B directly from Active | Account B Closed (t5) |

Every step asserts the resulting **observable state** (admin-panel
status, login response, email), never just "action accepted". Expand
each into a full runnable script via
[`manual-test-script-author`](../manual-test-script-author/SKILL.md).

## Step 5 - Add invalid-transition tests

For all-transitions coverage, §4.2.4 requires that test cases "exercise
all the valid transitions and attempt to execute invalid transitions",
and warns: "testing only one invalid transition in a single test case
helps to avoid defect masking, i.e., a situation in which one defect
prevents the detection of another"
([CTFL v4.0.1](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)).
So: one empty cell per test case. The two highest-risk cells here:

**TC-INV-1 (Locked + login-success).** Precondition: account Locked.

| # | Action | Expected result |
|---|---|---|
| 1 | Attempt login with the **correct** password | Login rejected with an account-locked message; account remains Locked; no session created |

**TC-INV-2 (Closed + admin-unlock).** Precondition: account Closed.

| # | Action | Expected result |
|---|---|---|
| 1 | As admin, attempt to unlock the closed account | Operation rejected or not offered; account remains Closed |

Full all-transitions coverage means attempting all 15 empty cells (24/24
items). At minimum, cover every empty cell in rows reachable by end
users (Locked, Closed) - those are the abuse paths.

## Why 1-switch catches what 0-switch misses

TC-ST-1 through TC-ST-3 reach 100% valid-transitions coverage, yet never
execute the transition *pair* (t6 admin-unlock, then t2 login-fail). If
the unlock handler forgets to reset the failure counter, one wrong
password after an unlock immediately re-locks the account - a real
defect that 0-switch coverage cannot see, because t6 and t2 were each
exercised, just never consecutively. A 1-switch is exactly this "pair of
incoming and outgoing transitions at a state"
([CTAL-TA v4.0 §3.2.2](https://astqb.org/assets/documents/ISTQB-CTAL-TA-Syllabus-v4.0-EN-4.pdf)).
Add:

**TC-SW-1 (pair t6 then t2).** Lock the account (3 failed logins), admin
unlocks, then attempt **one** wrong-password login. Expected: login
rejected, account remains **Active** (counter restarted at 0, not 3).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Only testing the happy path through the machine | One pass touches a few transitions; here a single Active to Closed walk covers 4 of 9 valid transitions and 0 invalid ones | Pick an explicit coverage level (Step 3) and derive per coverage item |
| Ignoring invalid-event behavior | The empty cells are where lockout bypasses and zombie-state bugs live; §4.2.4 makes them explicit coverage items in all-transitions coverage | At least the user-reachable empty cells get a TC each (Step 5) |
| Bundling several invalid transitions in one TC | §4.2.4: one invalid transition per test case avoids defect masking | Split: one empty cell per TC |
| Stopping at all-states coverage | §4.2.4 calls it weaker than valid-transitions coverage; one walk can satisfy it while skipping most transitions | Use valid-transitions (0-switch) as the floor |
| Merging guarded variants into one event column | The 3rd `login-fail` has a different target state than the 1st; one column hides t3 | Split columns per guard (Step 1) |
| Modeling implementation states (DB flags) instead of spec states | The model stops matching observable behavior; expected results become unverifiable for a manual tester | States must be distinguishable through the UI/API the tester can observe |

## Limitations

- **Model quality bounds test quality.** The technique only finds
  defects the state model can express; a missing state in the model is
  invisible to every coverage level.
- **Transitions are modeled as instantaneous** (§4.2.4: "the transitions
  are assumed to be instantaneous"). Races mid-transition (two admins
  acting at once) need concurrency testing, not this technique.
- **N-switch explodes.** Per CTAL-TA §3.2.2 the number of N-switches
  grows exponentially with N; reserve 2-switch+ for high-risk machines.
- **Stateless logic does not belong here.** Pure input-combination rules
  go to
  [`decision-table-test-design`](../decision-table-test-design/SKILL.md).

## References

- ISTQB CTFL Syllabus v4.0.1, §4.2.4 State Transition Testing -
  [istqb.org PDF](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)
  (official syllabus, fetched 2026-06-10; CTFL quotes above are from
  this section).
- ISTQB CTAL-TA Syllabus v4.0, §3.2.2 State Transition Testing -
  [astqb.org PDF](https://astqb.org/assets/documents/ISTQB-CTAL-TA-Syllabus-v4.0-EN-4.pdf)
  (N-switch / Chow 1978 / round-trip coverage; fetched 2026-06-10).
  Chow T.S. (1978), "Testing Software Design Modeled by Finite-State
  Machines", is cited here via the CTAL-TA syllabus.
- ISTQB Glossary terms "state transition testing" and "N-switch
  coverage" exist at glossary.istqb.org but the site blocks non-browser
  fetches; cite the syllabus sections above as the stable sources.
- Siblings:
  [`decision-table-test-design`](../decision-table-test-design/SKILL.md)
  (stateless rule logic),
  [`manual-test-script-author`](../manual-test-script-author/SKILL.md)
  (expands derived cases into runnable scripts).
- Neighbors this skill is distinct from:
  [`test-case-ideation-from-story`](../../../qa-process/skills/test-case-ideation-from-story/SKILL.md),
  [`boundary-value-generator`](../../../qa-test-data/skills/boundary-value-generator/SKILL.md),
  [`test-case-anatomy-reference`](../../../qa-test-management/skills/test-case-anatomy-reference/SKILL.md).
