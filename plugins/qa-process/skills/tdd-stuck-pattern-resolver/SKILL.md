---
name: tdd-stuck-pattern-resolver
description: "Pattern catalog for \"I can't write the test first\" moments - recognizes common testability blockers (singletons / static dependencies, network in constructors, time / random as hidden inputs, deeply nested construction, untestable boundaries) and proposes the refactor that unblocks TDD (extract interface, dependency injection, seam, ports-and-adapters). Use as TDD coaching when an engineer is stuck on a class of code. For a catalog of what-to-test heuristics with no story use heuristic-test-design-reference, to label a change's shape before planning test effort use code-change-shape-classifier, and for conventions on writing the test well once the code is testable use test-code-conventions."
---

# tdd-stuck-pattern-resolver

## Overview

TDD's "write the test first" rule breaks against certain code
shapes. The engineer hits the wall, abandons TDD, writes the code
first, then writes the test second (or skips it). The wall isn't
TDD - it's the code shape.

This skill is a **catalog** of common stuck patterns + the refactor
that unsticks each. It's a coaching reference, not a prescription - 
the engineer picks the appropriate refactor for their codebase.

## When to use

- An engineer says "I can't write the test first for this."
- A pairing session reveals testability gaps.
- A codebase has many "I'll add tests later" comments.
- A new engineer is learning TDD and hits common blockers.

For TDD basics, defer to [Kent Beck's *Test-Driven Development by
Example*][beck-tdd] (the canonical reference). This skill addresses
the second-order problem: the code resists TDD.

[beck-tdd]: https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530

## How to use

1. When an engineer says "I can't write the test first," name the
   code shape that's blocking - which of the eight patterns below it
   matches.
2. Run the decision tree to route the symptom to a pattern number.
3. Open the matching references file for the full before/after example
   and the seam it introduces.
4. Apply the refactor incrementally - one method or one dependency at a
   time (strangler fig), never a big-bang rewrite.
5. Move the substituted dependency to the single composition root, so
   construction becomes pure assignment.
6. Write the test first now that the seam exists, passing a fake at the
   seam.
7. Repeat per blocker; defer to Beck for TDD basics and
   `test-code-conventions` for writing the test well.

## The stuck patterns

Each pattern pairs a testability blocker with the refactor that opens a
seam. Full before/after code for every pattern lives in the linked
references file.

| # | Stuck pattern | Refactor | Full example |
|---|---------------|----------|--------------|
| 1 | Singleton / static dependency | Dependency injection | [references/injection-patterns.md](references/injection-patterns.md) |
| 2 | Network (or other I/O) in constructor | Push side effects out of construction | [references/injection-patterns.md](references/injection-patterns.md) |
| 3 | Time / random as hidden input | Inject the source (`now`, `rand`, `Clock`) | [references/injection-patterns.md](references/injection-patterns.md) |
| 4 | Untestable boundaries (file system, OS) | Ports-and-adapters (hexagonal) | [references/boundary-adapter-patterns.md](references/boundary-adapter-patterns.md) |
| 5 | Deeply nested construction | Factory + composition root | [references/structural-patterns.md](references/structural-patterns.md) |
| 6 | Untestable private methods | Test through the public interface, or extract a class | [references/structural-patterns.md](references/structural-patterns.md) |
| 7 | Async / Promise-heavy code | Split into orchestrator + injected steps | [references/structural-patterns.md](references/structural-patterns.md) |
| 8 | Code that calls third-party SDKs | Adapter (don't mock what you don't own) | [references/boundary-adapter-patterns.md](references/boundary-adapter-patterns.md) |

## Decision tree

```
Is your test setup more than 10 lines?         → Pattern 5 (composition root)
Is your test using `await fetch` / network?    → Pattern 4 (port/adapter) or Pattern 8 (gateway adapter)
Does your code call `Date.now()` / `Math.random()`? → Pattern 3 (inject)
Are you wanting to mock a singleton?            → Pattern 1 (DI)
Constructor does I/O?                           → Pattern 2 (push out)
Async chain with 5+ awaits?                     → Pattern 7 (orchestrator)
Want to test private methods?                   → Pattern 6 (extract or test through public)
```

## Worked example

An engineer is stuck on `processOrder`, which reads its data through a
global singleton:

```javascript
function processOrder(orderId) {
  const order = Database.getInstance().findOrder(orderId);
  // ...
}
```

1. **Route it.** The decision tree entry "wanting to mock a singleton"
   points to Pattern 1.
2. **Open** [references/injection-patterns.md](references/injection-patterns.md)
   and apply Dependency Injection: add a `db` parameter so the caller
   supplies the dependency.
3. **Move** `Database.getInstance()` to the composition root, the single
   place that passes it in production.
4. **Write the test first**, injecting a fake:
   `processOrder(1, { findOrder: () => ({ id: 1 }) })`.

Result: the test runs with no global state touched, and the "I can't
write the test first" wall is gone - the blocker was the code shape,
not TDD.

## Anti-patterns

| Anti-pattern                                                         | Why it fails                                                              | Fix |
|----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Skipping the test first because "this is hard to test"               | Code stays untestable; debt compounds.                                    | Apply one of the patterns. |
| Reflection to access private methods                                  | Couples tests to implementation; refactors break.                        | Test through public interface (Pattern 6). |
| Mocking 5 globals to test one function                                | Brittle; tests verify mocks, not behavior.                               | DI + factory (Patterns 1, 5). |
| "We'll refactor later"                                                | Later never comes.                                                        | Apply pattern incrementally - one method at a time. |
| Big-bang refactor for testability                                     | Risky; tests break for unrelated reasons.                                | Strangler fig - incrementally extract; test new code; old code unchanged. |

## Limitations

- **Patterns are language-agnostic; idioms vary.** Java's DI
  framework (Spring) differs from JS's manual injection.
- **Refactor cost.** Some refactors require touching many files;
  budget accordingly.
- **Architectural-level patterns.** Hexagonal architecture is a
  large commitment; for small projects, simpler patterns suffice.
- **Doesn't replace TDD training.** Apply alongside Beck-style
  TDD coaching, not as a substitute.

## References

- Beck, K., *Test-Driven Development by Example* (2003) - the
  canonical TDD reference.
- *Working Effectively with Legacy Code* by Michael Feathers
  (2004) - the canonical "how to add tests to untestable code"
  reference; introduces the "seam" concept this skill draws from.
- `test-code-conventions` - §5 covers the test-double taxonomy this skill references.
