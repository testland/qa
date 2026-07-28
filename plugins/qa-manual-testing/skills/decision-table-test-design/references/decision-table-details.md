# Extended-entry tables and anti-patterns

Deep reference for `decision-table-test-design` SKILL.md. Section numbers
(§4.2.3) refer to ISTQB CTFL Syllabus v4.0.1, cited in full in the skill's
References section.

## Limited-entry vs extended-entry tables

Per §4.2.3: "in limited-entry decision tables all the values of the
conditions and actions (except for irrelevant or infeasible ones) are
shown as Boolean values", while "in extended-entry decision tables some
or all the conditions and actions may also take on multiple values (e.g.,
ranges of numbers, equivalence partitions, discrete values)".

The tables in the skill body are limited-entry. If the spec later adds a
tier (orders of $200 or more ship express free for everyone), prefer one
extended-entry condition over two correlated Booleans:

| | E1 | E2 | E3 |
|---|---|---|---|
| C1 member | F | F | F |
| C2 order total | < $50 | $50 to $199.99 | >= $200 |
| C3 express | F | T | T |
| Action: fee | $5.99 | $14.99 | $0.00 |

Extended entries keep correlated conditions (total >= $50, total >= $200)
in one row, which avoids manufacturing infeasible columns like
"total >= $200 but not >= $50".

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Testing only the happy columns | The spec's gaps live in the F-heavy columns; §4.2.3's whole point is the combinations that would otherwise be overlooked | One test case per feasible column; coverage = exercised/feasible columns |
| Skipping infeasible-combination analysis | Naive collapses (R1 + R3 here) produce test cases for unreachable states; testers burn time failing to set them up | Step 4 before finalizing any merge; add a constraint check per deleted column |
| Collapsing before checking actions match | A dash that hides two different outcomes silently deletes a rule | Merge only when every expansion yields identical action rows |
| Tables with many conditions, no reduction | §4.2.3: "the number of rules grows exponentially with the number of conditions" | Per §4.2.3, use "a minimized decision table or a risk-based approach"; or split the rule set per feature |
| Non-atomic conditions ("member with big order") | Column semantics become ambiguous; collapse logic breaks | One yes/no question per condition row (Step 1) |
| No action row for an outcome in the spec | The table cannot reveal the contradiction it was built to find | Re-extract actions until every spec outcome maps to a row |
