---
name: input-domain-coverage-audit
description: "Audits a test file's input-domain coverage per entry point across three axes: equivalence partitioning (clustering the literal values the tests actually pass, to infer which partitions are exercised), boundary value analysis (recorded n/a when the entry point declares no bound), and error/negative-path coverage (classifying every matcher as positive or negative and computing the negative-assertion ratio). Emits a PASS / SHALLOW / N/A verdict per axis per entry point, with the evidence that produced it. Owns whether the test data spans the input space, not whether an individual assertion is specific enough: matcher specificity belongs to `test-code-conventions`. Use when a test file's cases all look alike - every argument the same shape, every response a success, no thrown-error case - and the suite needs a defensible answer on whether it exercises more than one equivalence class before it is approved."
---

# input-domain-coverage-audit

## The axis this owns

Two different questions can be asked about the same test file:

| Question | Owner |
|---|---|
| Is this assertion strong enough to fail when the code breaks? | Matcher specificity. `test-code-conventions` owns it. |
| Does the test data span the input space, or is every case the same kind of input? | Input-domain coverage. This audit owns it. |

A file can pass one and fail the other in either direction. Four tests that
each assert a precise deep-equal result are specific, and still shallow if all
four pass the same kind of argument. One test that passes a valid value and an
invalid value spans two partitions, and is still weak if it only asserts
`toBeTruthy()`. Run both checks; neither substitutes for the other.

This audit is static: it reads test source and the constraints declared on the
code under test. It does not execute the suite, and it does not read line or
branch coverage reports.

## The three axes

Each axis maps to a canonical black-box technique.

| Axis | Technique | The audit asks |
|---|---|---|
| `§EP` | [Equivalence partitioning](https://glossary.istqb.org/en_US/term/equivalence-partitioning): "a black-box test technique in which test conditions are equivalence partitions exercised by one representative member of each partition" | Does the suite exercise at least one valid partition **and** at least one invalid partition per parameter? |
| `§BVA` | [Boundary value analysis](https://glossary.istqb.org/en_US/term/boundary-value-analysis): "a black-box test technique in which the test conditions are boundary values" | For each declared bound, does at least one test sit on the boundary or its nearest neighbor outside it? |
| `§NEG` | [Negative testing](https://glossary.istqb.org/en_US/term/negative-testing): "a test type in which a component or system is used in a way that it is not intended" | Does at least one assertion target the rejection path rather than the success path? |

An [equivalence partition](https://glossary.istqb.org/en_US/term/equivalence-partition)
is "a subset of a value domain for which a component or system is expected to
treat all values the same based on the specification", and a
[boundary value](https://glossary.istqb.org/en_US/term/boundary-value) is "a
minimum or maximum value of an ordered equivalence partition". Both definitions
are properties of the specification, not of the test file, which is why this
audit reads the declared contract alongside the tests.

Shallow input coverage is not specific to generated tests. Hand-written suites
drift the same way when new cases are added by copying the nearest existing
test and changing one literal.

## Step 1 - Inventory the entry points and their input values

For each entry point the file exercises (the function, method, route, or
command named in the Act phase of the tests), build one row:

- the entry point signature, including each parameter;
- every literal argument and fixture value passed to it anywhere in the suite,
  grouped by parameter position;
- the declared contract for each parameter: schema bounds, validation
  decorators, type-level constraints, documented ranges;
- the declared error contract: exceptions thrown, promises rejected, error
  values returned, non-success status codes documented.

Everything after this step operates on that row. If the contract column is
empty for a parameter, that is a finding about the code, not yet a finding
about the test: axes are recorded `n/a` rather than SHALLOW when the
specification declares nothing to partition against.

## Step 2 - §EP, equivalence partitioning

The audit does not have the specification's partition list, so it infers
partitions from the test data actually used. Cluster the collected values per
parameter and flag when every value falls into one cluster.

Literal-clustering heuristic, applied per parameter:

| Observation across all values for the parameter | Inference |
|---|---|
| All strings the same length and the same character class | Likely one partition |
| All integers the same sign and the same order of magnitude | Likely one partition |
| All enum arguments the same member | One partition |
| No `null`, no `undefined`, no empty value, no omitted field anywhere | No invalid partition exercised |

The heuristic answers "did the author vary this input at all", which is the
question that catches the copy-the-neighboring-test failure. It does not
answer "are these two values in genuinely different partitions": two values can
differ in length and character class and still be members of the same invalid
partition (two differently malformed email addresses are still one partition).
Treat a multi-cluster result as absence of evidence for shallowness, not proof
of good partitioning.

**The PASS bar.** The ISTQB CTFL syllabus v4.0.1 §4.2.1 (page 39) requires, for
100% EP coverage, that test cases exercise every identified partition (invalid
ones included) at least once; Each Choice coverage extends this per parameter.
Verbatim quotations and the coverage formula are in
[references/grounding.md](references/grounding.md).

This audit's PASS bar is one valid partition plus one invalid partition per
parameter - a floor beneath the syllabus criterion, not a restatement of it:
clearing the floor only establishes that more than one partition was exercised,
not 100% EP coverage. Where the specification enumerates partitions, measure
against the syllabus formula instead (partitions exercised / partitions
identified, as a percentage).

`§EP` verdict:

- **PASS** when at least one valid and one invalid partition are exercised for
  every parameter.
- **SHALLOW** when every collected value for any parameter clusters into a
  single partition.
- **n/a** only when the entry point takes no parameters.

## Step 3 - §BVA, boundary value analysis

Boundaries exist only where an order exists: the CTFL syllabus v4.0.1 §4.2.2
(page 40) states BVA can only be used for ordered partitions. That is the
grounding for the `n/a` rule below, not a convenience exemption.

For each parameter with a machine-readable bound (a schema `minimum` /
`maximum` / `minLength` / `maxLength`, a validation decorator, an interface
contract with a documented range, a declared collection-size limit), check that
at least one test exercises a value at `min`, `min-1`, `max`, or `max+1`.

That check is 2-value BVA (the boundary value plus its closest neighbor in the
adjacent partition). Teams holding a stricter bar use 3-value BVA, adding
`min+1` and `max-1`. Verbatim §4.2.2 quotations are in
[references/grounding.md](references/grounding.md).

`§BVA` verdict:

- **PASS** when every declared bound has at least one test on the boundary or
  its neighbor outside it.
- **SHALLOW** when a bound is declared and no test sits at or beside it.
- **n/a** when no ordered constraint is declared for any parameter. Record
  `§BVA: n/a` and move on. Demanding a boundary case for an unbounded or
  unordered parameter is a false finding, not a strict one.

## Step 4 - §NEG, error and negative paths

Classify every assertion in the suite for this entry point as positive or
negative by what it targets:

| Class | The assertion targets |
|---|---|
| **Positive** | A returned value, an expected object shape, a success status code (`2xx`), presence of a result. Equality and deep-equality matchers land here by default. |
| **Negative** | A raised exception or its type, a rejected promise, a client or server error status (`4xx` / `5xx`), a logged error, a validation message on the rejection path. |

Classify by target, not by matcher name. An equality matcher asserting that a
response body carries a validation error, or that a status equals `422`, is a
negative assertion. A matcher named for exceptions that is asserted never to
fire is not.

Then compute the negative-assertion ratio for the entry point:

```text
negative_assertion_ratio = negative_assertions / total_assertions
```

Flag `§NEG` when the ratio is exactly zero for an entry point that has any
declared error contract: it throws, it rejects, it returns an error value, or
it documents a non-success response.

**The zero threshold is a practitioner convention, not a standard.** No
published standard fixes a minimum negative-assertion ratio; zero is used
because it is unambiguous - a declared error contract with no assertion on it
has left a documented behaviour untested. Teams setting a floor above zero are
choosing a local convention; report it as such, not as a canonical requirement.

`§NEG` verdict:

- **PASS** when the ratio is above zero.
- **SHALLOW** when the ratio is zero and an error contract is declared.
- **n/a** when no error contract is declared. A total function such as
  `add(a: int, b: int): int` has no rejection path to assert on.

## Step 5 - Roll up the per-axis verdicts

Score all three axes before deciding anything. Stopping at the first SHALLOW
axis produces reports that demand boundary tests for unbounded parameters and
error tests for total functions.

The entry point's verdict is its weakest applicable axis: SHALLOW if any
applicable axis is SHALLOW, PASS if every applicable axis is PASS, and N/A if
all three axes are `n/a`.

Every SHALLOW cell carries its evidence: which values were collected, which
partition they clustered into, which declared bound has no test beside it,
which error contract has no assertion. A verdict without the evidence that
produced it cannot be argued with, and gets ignored.

## Output format

One section per entry point, each with the three-axis table and a verdict line.

```markdown
## Input-domain coverage audit

**Entry points reviewed:** 2
**SHALLOW verdicts:** 1

### `src/cart/addItem.ts` -> `addItem(productId, qty)`

| Axis | Result | Evidence |
|---|---|---|
| §EP equivalence classes | SHALLOW | All 4 tests pass `productId` as a 24-char hex string and `qty` as a small positive integer (1-3). No invalid `productId`, no `qty=0`, no negative `qty`, no `null`. |
| §BVA boundaries | SHALLOW | Schema declares `qty: { min: 1, max: 99 }`. No test at `qty=1`, `qty=0`, `qty=99`, or `qty=100`. |
| §NEG error paths | SHALLOW | 11 of 11 assertions are positive (`.toEqual`, `.toBe`); ratio 0. `addItem` declares `throws InvalidQtyError`; no test asserts the throw. |

**Verdict: SHALLOW.** Add at least: (a) one invalid-`productId` case (§EP),
(b) boundary cases at `qty=0` and `qty=100` (§BVA), (c) one assertion on
`InvalidQtyError` (§NEG).

### `src/cart/getCart.ts` -> `getCart(userId)`

| Axis | Result | Evidence |
|---|---|---|
| §EP equivalence classes | PASS | Suite exercises an authenticated user, an anonymous user, and a tenant-mismatched user: three partitions, one of them invalid. |
| §BVA boundaries | n/a | No ordered constraint declared on `userId`. |
| §NEG error paths | PASS | 3 of 8 assertions target `UnauthorizedError` on the rejection path; ratio 0.375. |

**Verdict: PASS.**
```

Remediation is a separate job. This audit names the missing case class and the
axis that demands it; producing the case values is the work of a boundary-value
or negative-case data generator.

## Worked example

A full walk of `createUser(email, age)` across all three axes - three
happy-path tests that clear no axis, and the minimum set that fixes each - is in
[references/worked-example.md](references/worked-example.md).

## Anti-patterns

| Anti-pattern | Why it fails | Correction |
|---|---|---|
| Counting three happy-path tests as EP coverage | Three tests of the same partition are one test, repeated: volume of cases is not breadth of input. Survey stats on AI test generation are in [references/grounding.md](references/grounding.md). | Cluster the literal arguments per parameter (Step 2) before counting anything. |
| Demanding §BVA on an unordered or unbounded parameter | BVA "can only be used for ordered partitions" (CTFL v4.0.1 §4.2.2). | Record `§BVA: n/a` when no ordered constraint is declared. |
| Verdict issued on the first SHALLOW axis | Some entry points legitimately have no bound and no error contract; a partial walk manufactures findings. | Score all three axes, then roll up (Step 5). |
| Demanding negative cases for a total function | A function whose domain is total has no rejection path. | Treat a declared throw, rejection, error return, or non-success response as the §NEG trigger; no declaration means `n/a`. |
| Auditing production source for shallowness | Input-domain coverage is a property of the test data, not of the implementation. | Scope the audit to test files; use mutation or coverage tooling for judgements about the implementation. |
| Reporting a SHALLOW cell without evidence | An unevidenced verdict cannot be checked or argued with, so it is dismissed. | Every cell names the values collected, the bound with no neighbor, or the unasserted error contract. |

## Limitations

- **Heuristic, not formal partition analysis.** §EP clustering compares literal
  values. Two values in the same partition can be scored as two partitions, and
  a multi-cluster result is weaker evidence than an explicit partition list
  from the specification.
- **§BVA depends on machine-readable constraints.** Schema bounds, decorators,
  and typed ranges are detectable; a bound stated only in a free-text comment
  is not, and the axis will read `n/a` where a real bound exists.
- **Static only.** No execution, so no mutation score and no branch coverage.
  Where a mutation-testing tool is available, its score is the stronger
  shallowness signal and this audit is the cheap pre-check that explains which
  input classes are missing.
- **Unit and component scope.** For suites where coverage is argued at the
  system level rather than per entry point, the per-parameter partition walk
  does not apply cleanly; audit those against their own coverage model.
- **Framework idioms vary.** Assertion classification in Step 4 is by target,
  which holds across frameworks, but locating assertions and fixture values in
  an unfamiliar test framework may need a manual pass.
