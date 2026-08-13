# Charter-card template

Deep reference for `exploratory-testing` SKILL.md. A ready-to-fill SBTM
charter card: mission statement, scoped areas, applicable HICCUPPS-F oracles,
SFDPOT dimensions to vary, and 1-3 recommended tours - so a junior or
mid-level tester can start a session without further scaffolding.

## The mission

The SBTM charter mission follows Bach's canonical three-part pattern
(Bach J. + Bach J., "Session-Based Test Management", HP, 2000; landing
page at satisfice.com/session-based-test-management):

```
Explore <area>
With <resources / tools / technique>
To discover <what you want to learn>
```

The "to discover" clause is load-bearing: per Bach's definition at
satisfice.com/exploratory-testing, "exploratory testing means performing
tests while learning things that may influence the testing." The mission
must name what the tester is trying to learn - not just what to click.

Bad: "Explore the promo code feature."
Good: "Explore the promo code apply flow with boundary inputs and stacking
combinations to discover discount-calculation defects and error-state gaps."

## Selecting the lenses

1. **HICCUPPS-F oracles** ([hiccupps-f.md](hiccupps-f.md)): pick 2-4
   oracles that match the risk areas, and label them in the charter so the
   tester knows what standard of comparison to consult on suspect
   behaviour. Example for a "discount math" risk area:
   - C (Claims): Does the discount match the spec / acceptance criteria?
   - H (History): Did it work in the last release?
   - P (Product - internal consistency): Does cart total match receipt total?
   - S (Standards): Any locale-specific receipt-total statutes?
2. **SFDPOT dimensions** ([sfdpot.md](sfdpot.md)): pick the dimensions
   most relevant to the risk areas; annotate each with 1-2 concrete
   variation ideas. Example for an "expiry timing" risk area:
   - T (Time): apply promo 1 minute before expiry; apply 30 seconds after expiry.
   - D (Data): promo with no expiry set; promo with expiry = epoch zero.
3. **Tours** ([tours.md](tours.md)): select 1-3 by mission type; note
   which SFDPOT dimension each tour primarily exercises.

| Mission type | Recommended tours |
|---|---|
| New feature | Feature tour + Bad-data tour |
| Post-change regression | Landmark tour + Garbage collector's tour |
| Complex business logic | Intellectual tour |
| Money / pricing / billing | Money tour |
| Config / flags / roles | Configuration tour |

Cap at 3 tours per 90-minute session.

## The charter card

Write to `charters/<YYYY-MM-DD>-<kebab-feature>.md`:

```markdown
# Charter - <YYYY-MM-DD> - <kebab-feature>

**Mission:** Explore <area> with <resources> to discover <what to learn>.

**Created from:** <story / ticket / PR reference>
**Target build / SHA:** (tester fills before session)
**Time-box:** 90 min  (split into two 90-min charters if scope exceeds 7 areas)
**Tester:** ___________  **Date:** ___________

## Areas (3-7)

(derived from the risk areas supplied)

## Applicable HICCUPPS-F oracles

(2-4 oracles with one-line rationale each - see hiccupps-f.md)

## SFDPOT dimensions to vary

(3-5 dimensions with 1-2 concrete variation ideas each - see sfdpot.md)

## Recommended tours

(1-3 tours with brief rationale - see tours.md)

## Suggested test ideas

(5-10 concrete seed ideas derived from the above; the tester adapts these
moment-to-moment, not as a script)

## Out of scope

(explicit list: performance, security, cross-browser, a11y unless risk areas
named them; anything out of the feature's blast radius)

## Deliverables

- PROOF debrief at session end (Past, Results, Outlook, Obstacles,
  Feelings - see debrief.md).
- Bugs filed with oracle citation ("why is this a bug? - violates Claims oracle:
  spec says X, system does Y").
- Coverage note: which areas had time, which areas were blocked.

## Session log

(tester fills during the session)

## Sign-off

**Tester:** ___________  **End time:** ___________
**Time in test design:** ___ min  **In setup:** ___ min  **In bug investigation:** ___ min
```

## Charter quality rules

A charter is not well-formed if any of these hold - fix before the session:

- **No feature description.** "Test feature X" names a target without
  context; the charter needs the story / PR / one-paragraph summary it
  was created from.
- **No risk areas.** The charter's areas derive from risk areas; without
  them the output is a vague scope, not a charter.
- **Time-box over 120 min.** Split into two charters instead (per Bach's
  ~2-hour focus-degradation finding).
- **Multiple missions.** "...and also cover the auth flow" is a second
  charter, not a second bullet. One mission per charter.

## References

- Bach J. + Bach J., "Session-Based Test Management" (HP, 2000) - 
  satisfice.com/session-based-test-management (landing page; PDF download).
- Bach J., "Exploratory testing means performing tests while learning things
  that may influence the testing" - satisfice.com/exploratory-testing.
- Bolton M., "HICCUPPS-F" (2012) - developsense.com/blog/2012/07/few-hiccupps.
- Bach J., SFDPOT - satisfice.com/heuristics-of-software-testability.
- Whittaker J., *Exploratory Software Testing* (Addison-Wesley, 2009).
- Sibling references: [hiccupps-f.md](hiccupps-f.md), [sfdpot.md](sfdpot.md),
  [tours.md](tours.md), [debrief.md](debrief.md),
  [session-sheet-and-metrics.md](session-sheet-and-metrics.md).
