# Applying the five removal classes

Deep reference for `test-removal-criteria` SKILL.md (Step 2). Consult when
confirming a class that Step 1 proposed: the normalized-signature test for
`duplicate`, the detection heuristic and code examples for `tautology` and
`trivial`, the thresholds and reviewer checklist for `dead-signal`, and the
confirmation step for `orphan`. Each class gets exactly one confirmation test
before the Step 3 delete gate runs.

## `duplicate`

Compare a normalized signature, not assertion text. Cosmetic differences
(`toEqual` vs `toBe`, reordered setup lines, renamed local variables) hide
real duplicates, and identical text across different describe paths is often
not a duplicate at all. The signature is the tuple:

```
(describe-path, normalized-setup, normalized-assertion-arguments)
```

Two tests are duplicates only when all three match. Keep the copy in the
canonical location, normally the file co-located with the subject under test;
remove the stray copy left behind by a move or a copy-paste.

Before removing, check whether the pair is really a **fold** candidate
instead (Step 4). Meszaros treats repeated test code as a smell whose fix is
extraction and parameterization, not deletion
([Meszaros, Test Code Duplication](http://xunitpatterns.com/Test%20Code%20Duplication.html)).

## `tautology`

A tautology re-implements the subject under test inside the assertion, so it
passes for any implementation:

```typescript
// Tautology: the expected side redoes the arithmetic.
test('add adds', () => {
  expect(add(2, 3)).toBe(2 + 3);
});

// Tautology: the expected side calls the subject under test.
test('formats price', () => {
  expect(formatPrice(100)).toBe(formatPrice(100));
});

// Rewritten: a known-good value the test author committed to.
test('add adds', () => {
  expect(add(2, 3)).toBe(5);
});
```

**Detection heuristic:** the expected side of the assertion should contain
only literals, expected-value constants, or test-fixture lookups. If it
contains a call that resolves into a production module import, the assertion
is tautological. Matching on the literal shape `expect(x).toBe(x)` is not the
heuristic and misses nearly every real case, because the recomputation is
usually spelled differently on each side.

The default action for this class is **rewrite**, not remove. The test names a
behavior somebody cared about; only the assertion is broken. Remove only when
the rewrite produces something already covered elsewhere, which turns it into
a `duplicate` decision with its own evidence.

## `trivial`

```typescript
test('it works', () => {
  expect(true).toBe(true);   // self-satisfying
});

test('placeholder', () => {});   // no assertion at all
```

These are usually scaffolding left over from a test-first cycle. They execute
code and contribute to coverage numbers while verifying nothing, which is
exactly why coverage cannot be the deciding input: Fowler's account of an
assertion-free suite notes "you can do this and have 100% code coverage,
which is one reason why you have to be careful on interpreting code coverage
data"
([Fowler, Assertion-Free Testing](https://martinfowler.com/bliki/AssertionFreeTesting.html)).
Empirical work points the same way: assertion quantity and assertion coverage
correlate strongly with a suite's fault-detection ability measured by mutation
score, and the relationship is not explained by suite size alone (Zhang and
Mesbah, ESEC/FSE 2015,
[Assertions Are Strongly Correlated with Test Suite Effectiveness](https://people.ece.ubc.ca/amesbah/resources/papers/fse15.pdf)).

One caveat before removing: a body with no assertion still executes the code
and can surface crashes. Fowler concedes "some faults do show up through code
execution, eg null pointer exceptions"
([Fowler, Assertion-Free Testing](https://martinfowler.com/bliki/AssertionFreeTesting.html)).
If the smoke value is the point, the fix is to add the missing assertion, not
to delete the test.

## `dead-signal`

This is the class that most often gets removed wrongly. A test qualifies as a
dead-signal *candidate* when it has recorded zero failures across the signal
window while the source files it covers have churned repeatedly. Candidacy is
not a verdict.

Typical thresholds, all practitioner conventions rather than standards, and
all worth tuning per team: a signal window of 180 days for the no-failure
check, at least 10 commits touching the covered files in that window, and a
hard minimum of 90 days of per-test history before the class is used at all.
Below that minimum there is no signal basis, and every candidate resolves to
keep.

**Reviewer checklist. Ask all three questions per test, in order:**

1. Has the subject's semantics that this test asserts been re-architected?
   If yes and the test still passes, the test may be a passive regression
   guard. **Keep.**
2. Is this test asserting trivially true behavior (the file imports, the class
   instantiates)? If yes, **remove** (and note that this is really a `trivial`
   removal, with that class's evidence).
3. Is this test asserting a business-critical invariant? **Keep regardless of
   failure history.** A regression here would be costly, and its cost is not
   reduced by the test's quiet record.

Dead-signal removals are never batched. Each one gets its own reviewer
sign-off, because the evidence is statistical and the failure mode is silent.

## `orphan`

The test imports a module or calls a symbol that no longer resolves, normally
the residue of a refactor that deleted the module but left the test behind,
broken or skipped. Confirm the target is genuinely gone rather than moved or
re-exported, then remove. Record the missing module in the reason so the
reviewer can tell "the module went away" from "the import path went stale".
