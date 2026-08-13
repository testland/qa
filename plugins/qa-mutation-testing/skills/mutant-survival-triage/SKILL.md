---
name: mutant-survival-triage
description: "Normalizes a surviving-mutant record across StrykerJS, PIT, mutmut, and Mull into one shape, classifies why it survived (missing case, weak assertion, equivalent mutant, unreachable code, flaky killer), applies per-mutator heuristics for conditional-boundary, arithmetic-operator, statement-removal, and constant mutations, and drafts the specific test that would kill it. Includes the full read-only investigation workflow: take a mutation report (Stryker JSON / PIT XML / mutmut output / Mull JSON) plus the repo at the same commit, read each survivor's mutated line and covering tests, classify, and propose - never auto-rewriting tests. Treats equivalence as a judgment call, because deciding whether a mutant is equivalent to the original is undecidable in general, so a residual survivor rate is expected rather than a defect. Use when a mutation run has finished and the report lists surviving mutants (typically 5+) that nobody has yet explained or turned into concrete test cases."
---

# mutant-survival-triage

Turns "this mutant survived" into "here is the specific test that would kill it,
and here is the input that separates the mutant from the original."

## What this owns, and what it does not

**Owns:** one surviving mutant at a time. Reading the mutated line and the tests
that already covered it, deciding which of five reasons explains the survival,
and writing a concrete test proposal (inputs plus the assertion) that would flip
the mutant to killed.

**Does not own:** installing or configuring a mutation testing tool, choosing
mutate globs, picking a mutation-score threshold, or wiring a build gate. Those
are per-tool configuration decisions and are settled before a report exists.
This work starts at the report and ends at a test proposal a human writes.

## Running the triage as an investigation

Inputs: a mutation report (Stryker JSON, PIT XML, mutmut output, Mull JSON)
and the source repo at the same commit. For each surviving mutant: read the
report entry, the mutated line with its surrounding context, and the tests
that executed the line without killing it (`git log` / `git blame` help date
the line and its tests); then classify (Step 2) and propose (Step 4).

Ground rules for the investigation - it is read-only:

- **Never auto-rewrite tests.** Recommendation only; the team writes the test
  (or accepts the equivalent-mutant explanation).
- **Never mark a mutant equivalent without surfacing the reasoning.** The
  reviewer must be able to disagree (Step 5).
- **Skip code under mutation-suppression pragmas** (e.g. mutmut's
  `# pragma: no mutate`) - the team explicitly opted out.

Downstream hand-offs: weak-assertion survivors → `test-code-critic`
(qa-test-review, assertion dimension); flaky-killer survivors →
`e2e-flake-bisector` (qa-flake-triage, shared-state isolation stage);
"where to add tests" rather
than "what to test" → `test-coverage-targeter` (qa-test-reporting).

## Step 1 - Normalize the survivor into one record

Every tool reports the same underlying facts in a different container. Flatten
each survivor into one record before classifying, so the heuristics below stay
tool-independent:

```typescript
interface SurvivedMutant {
  tool: 'stryker' | 'pit' | 'mutmut' | 'mull';
  file: string;
  line: number;
  column?: number;
  mutator: string;      // tool-native operator name, kept verbatim
  original: string;     // the source text before mutation
  mutated: string;      // the source text after mutation
  coveredBy: string[];  // tests that executed the line and did not kill it
}
```

Where each field comes from per tool, and why the non-killed statuses must not be
merged (`Survived` vs `NoCoverage` / no-coverage, `Timeout`, and the rest), is in
[references/tool-normalization.md](references/tool-normalization.md). One rule from
there is load-bearing for Step 2: a no-coverage mutant is never a weak-assertion
finding, because no assertion ran.

## Step 2 - Classify why it survived

Work the classes in this order. The cheap, tool-asserted ones come first, and
`equivalent-mutant` comes last because it is the only class that cannot be
proven (Step 5).

| Class | Signal to look for | Recommended action |
|---|---|---|
| `unreachable` | The tool reported no coverage, or the line sits in a path no caller can reach. | Delete the dead code, or record why the path is intentionally unexecuted. |
| `flaky-killer` | The same mutant id is killed in one run and survives in another with no source change; the covering test also appears in flake history. | Stabilize the covering test first, then re-run the mutant. A flaky test is not a mutation finding. |
| `missing-case` | The covering tests never supply an input on which the original and the mutant produce different observable behavior. | Add one test at the separating input (Step 3 gives the input per mutator). |
| `weak-assertion` | A covering test does exercise a separating input, but its assertion is too loose to observe the difference. | Tighten that assertion to the exact expected value, then re-run. Do not add a second test. |
| `equivalent-mutant` | No input exists on which the mutant and the original differ observably. | Record the reasoning, exclude the mutant, and accept the score cost (Step 5). |

The `missing-case` versus `weak-assertion` split is the whole decision: both look
identical in the report, and only reading the covering test tells them apart. Ask
one question: **did any covering test already run the separating input?** If yes
the test is the defect; if no the suite is.

## Step 3 - Per-mutator heuristics

The four mutation families below cover most survivors. Tool operator names differ,
so match on the family, not the string. The full operator-name-to-family mapping
across StrykerJS, PIT, mutmut, and Mull, with sources, is in
[references/tool-normalization.md](references/tool-normalization.md).

### Conditional boundary

```javascript
if (qty > maxQty) throw new Error('Cap exceeded');   // original
if (qty >= maxQty) throw new Error('Cap exceeded');  // mutant, survived
```

The separating input is always the boundary value itself. Here only `qty === maxQty`
distinguishes the two: the original does not throw, the mutant does. Any test at
`qty < maxQty` or `qty > maxQty` behaves identically under both and can never kill
this mutant, no matter how strict its assertion.

**Propose:** one test at exactly the boundary, asserting the original behavior.

### Arithmetic operator

```javascript
const total = subtotal + tax;   // original
const total = subtotal - tax;   // mutant, survived
```

Two survival causes, and they need different fixes:

- Every covering test uses the operator's identity value, so both forms agree
  (`tax === 0` here; `1` for a multiply-to-divide mutant). That is `missing-case`:
  add a test with a non-identity operand.
- A covering test does use a non-identity operand, but asserts a range or a
  truthiness check instead of the value, for example `expect(total).toBeGreaterThan(0)`.
  That is `weak-assertion`: replace it with exact equality on the computed number.

**Propose:** the non-identity operand plus an exact-value assertion.

### Statement or call removal

```javascript
notifyUser(orderId);   // original
                       // mutant: the call is gone, and it survived
return success;
```

A removed call survives whenever its only effect is outside the value under
assertion. The return value is unchanged, so an assertion on the return value can
never kill it. This is almost always `missing-case` for an unobserved side effect,
not a loose assertion.

**Propose:** verify the effect, not the return. A test double on the collaborator
asserting it was called with `orderId`, or an assertion against the state the call
was supposed to change.

### Constant or literal

```javascript
const PAGE_SIZE = 42;  // original
const PAGE_SIZE = 0;   // mutant, survived
```

A surviving constant mutation means no assertion is coupled to the constant's
value. The common shapes: the behavior the constant drives (here, pagination) has
no test at all, or the test hard-codes its own copy of the value and never reads
the production one. The second shape is the trap, because the test looks like
coverage.

**Propose:** an assertion on the behavior the constant drives, reading the
production constant rather than restating the literal. Note that PIT's default
return mutators (`EMPTY_RETURNS`, `NULL_RETURNS`, `PRIMITIVE_RETURNS`) produce the
same shape at the return boundary
([PIT mutation operators](https://pitest.org/quickstart/mutators/)).

## Step 4 - Propose the specific test

A proposal is complete only when all four are present:

1. **The separating input.** The concrete value on which the original and the
   mutant diverge. If you cannot name one, the classification is
   `equivalent-mutant`, not `missing-case`.
2. **The observable that differs.** Return value, thrown error, persisted state, or
   a collaborator call. A test that cannot observe it cannot kill the mutant.
3. **The exact assertion**, with the expected value written out.
4. **Whether an existing test should be tightened instead of a new one added.**
   Adding a second test next to a weak one leaves the weak assertion in place.

Emit one block per survivor:

````markdown
**Surviving mutant:** `src/cart.ts:42` - Equality Operator / GreaterThanBoundary
**Original:** `if (qty > maxQty) throw new Error('Cap exceeded');`
**Mutated:**  `if (qty >= maxQty) throw new Error('Cap exceeded');`
**Class:** missing-case (boundary)

**Covering tests that did not kill it:**
- `cart.spec.ts > addItem qty=1`   - `1 > 100` and `1 >= 100` are both false; identical behavior.
- `cart.spec.ts > addItem qty=101` - `101 > 100` and `101 >= 100` are both true; identical behavior.

**Separating input:** `qty === maxQty === 100`. Original: no throw. Mutant: throws.

**Proposed test (new):**
```ts
it('accepts a quantity exactly at the cap', () => {
  const cart = new Cart({ maxQty: 100 });
  expect(() => cart.addItem({ qty: 100 })).not.toThrow();
  expect(cart.items).toHaveLength(1);
});
```

**If a boundary test already exists and the mutant still survived,** the suite is
not the only suspect. Either the assertion does not observe the throw (for example
it wraps the call in a try/catch and asserts nothing), or the production boundary
is off by one and the existing test encodes the wrong expectation. Confirm the
intended cap semantics against the specification before changing either side.
````

That last paragraph is the point of the whole step: a survivor is evidence that
the test and the production code disagree with the specification somewhere, and
"add another test" is only one of the two possible resolutions.

## Step 5 - Equivalent mutants and the residual survivor rate

`equivalent-mutant` is a judgment, not a proof: finding equivalent mutants is
undecidable in general ([Straubinger, Degenhart and Fraser, 2024](https://arxiv.org/html/2404.09241v1),
citing Budd and Angluin, Acta Informatica 18, 31 to 45, 1982). StrykerJS agrees
"there is no definitive way for Stryker to find and ignore them" and to "accept
that you won't make 100%" mutation score
([Stryker equivalent mutants](https://stryker-mutator.io/docs/mutation-testing-elements/equivalent-mutants/));
PIT calls them "equivalent mutations" and filters some by not mutating lines that
call common logging frameworks ([PIT basic concepts](https://pitest.org/quickstart/basic_concepts/)).

Practical consequences for triage:

- **A non-zero survivor count is the expected steady state**, not an open defect
  queue. Track the count of survivors classified `equivalent-mutant` separately
  from the ones classified as test gaps, or the backlog never reaches zero and
  the team stops trusting it.
- **Every `equivalent-mutant` call ships with its reasoning**, naming why no input
  can separate the two forms. A second reader has to be able to disagree. An
  unexplained exclusion is indistinguishable from a missed test.
- **Recurring equivalent shapes are worth fixing at the source.** StrykerJS's own
  examples include neutral operations such as `number1 += 0` and comparisons where
  both sides are provably equal, and it suggests rewriting those code patterns
  ([Stryker equivalent mutants](https://stryker-mutator.io/docs/mutation-testing-elements/equivalent-mutants/)).

**If you quote a mutation score, state the convention.** StrykerJS documents two:
`detected / valid * 100`, which counts uncovered mutants against you, and
`detected / covered * 100`, which does not
([mutant states and metrics](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/)).
Neither excludes equivalent mutants, because no tool can identify them reliably, so
a score is always an underestimate of test strength by an unknown margin. Comparing
two scores computed under different conventions is meaningless.

## Output format

```markdown
## Mutation survivor analysis - <run id>

**Tool:** stryker | pit | mutmut | mull
**Survivors analyzed:** N
**Mutation score:** X% (convention: detected / valid)

| Class | Count | Recommended action |
|---|---:|---|
| missing-case | 14 | Add one test per separating input. |
| weak-assertion | 7 | Tighten the named existing assertion. |
| equivalent-mutant | 3 | Exclude, reasoning recorded below. |
| unreachable / no coverage | 2 | Remove the code or document the path. |
| flaky-killer | 1 | Stabilize the covering test, then re-run. |

### Per-survivor detail

(one Step 4 block per survivor)

### Top priority (5 to 10)

1. `file:line` - class - one-line description of the test to write.
```

Rank by blast radius of the mutated code, not by class. A surviving boundary
mutant in a pricing rule outranks ten survivors in a formatter.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Auto-generating a test for every survivor | Machine-written tests assert whatever the current code does, which kills the mutant while locking in the behavior nobody checked against the specification. | Propose the test, let a human write and review it. |
| Skipping the equivalent-mutant class entirely | The team burns weeks on mutants that no test can kill, then abandons mutation testing as noise. | Classify explicitly, and expect a residual rate (Step 5). |
| Adding a new test next to a weak assertion | The loose assertion stays and keeps hiding the next regression on that line. | Split `missing-case` from `weak-assertion` (Step 2) and tighten in place when it is the latter. |
| One recommendation per file instead of per mutant | Specific, actionable suggestions get averaged into "improve tests for cart.ts". | One block per survivor (Step 4). |
| Treating the covering test as correct by default | The mutant may be revealing an off-by-one in production code that the test faithfully encodes. | Check the boundary against the specification before choosing a side (Step 4). |
| Quoting a mutation score without its convention | Two teams report incomparable numbers and draw conclusions from the difference. | State `detected / valid` or `detected / covered` every time (Step 5). |

## Limitations

- **Classification is heuristic.** Every class except `unreachable` (which the tool
  asserts via its no-coverage status) is a judgment from reading code, and
  `equivalent-mutant` is undecidable in general (Step 5).
- **Business intent is not recoverable from source.** Whether the original boundary
  or the mutated one is correct is a specification question, not a code question.
- **Coverage links vary by tool.** StrykerJS reports `coveredBy` and `killedBy` per
  mutant ([report schema](https://raw.githubusercontent.com/stryker-mutator/mutation-testing-elements/master/packages/report-schema/src/mutation-testing-report-schema.json)),
  while Mull's survivor lines carry no per-mutant test list
  ([Mull tutorial](https://mull.readthedocs.io/en/latest/tutorials/HelloWorld.html)).
  Where the link is missing, the `missing-case` versus `weak-assertion` split needs
  a manual re-run of the suspected test against an applied mutant.
- **Operator coverage differs by tool.** A family absent from one tool's operator
  set produces no survivors of that shape there, which is a gap in the signal, not
  evidence of a stronger suite.
