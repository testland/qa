# PIT - anti-patterns and limitations

Detailed pitfalls and constraints for `pitest-mutation`. Linked inline from that skill's SKILL.md.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mutating the entire codebase every PR | Slow; team disables. | `withHistory` + per-changed-file scope. |
| `mutationThreshold: 100` | Unreachable; first failed run blocks all PRs. | Start at the current baseline; ratchet up. |
| Mixed Maven/Gradle config (both plugins active) | Conflicting configurations; cryptic errors. | Pick one build tool. |
| Missing JUnit 5 plugin dependency | Tests don't run; mutation coverage 0. | Add `pitest-junit5-plugin` for JUnit 5. |
| Targeting test classes in `targetClasses` | Mutates test code; meaningless. | `targetClasses` = production package; `targetTests` = test package. |
| All mutators (`ALL` mutator set) | Many irrelevant mutants; long runtime. | `DEFAULTS` (default) or `STRONGER`. |

## Limitations

- Bytecode-level. PIT mutates compiled .class files; some language-level constructs (Kotlin sealed classes, certain generics) produce equivalent mutants.
- Build-time integration. Requires Maven / Gradle; standalone PIT is awkward for Bazel / Pants.
- Commercial Kotlin / Spring features. ArcMutate is paid; open-source PIT covers the basics.
- Per-class scope only. No file-level or method-level scoping out of the box; use `targetClasses` patterns.
