# Stryker.NET mutators and configuration reference

Full mutator set and configuration options for `stryker-net-mutation`. Linked
inline from that skill's SKILL.md, which keeps the conditional-boundary example
in the spine.

## Mutators at the Standard level

A surviving mutant means the test suite doesn't distinguish the original behavior
from the mutated one. Common mutators:

| Mutator                | Example                                                |
|------------------------|--------------------------------------------------------|
| Arithmetic operator    | `+` → `-`, `*` → `/`                                   |
| Conditional boundary   | `<` → `<=`, `>` → `>=`                                 |
| Conditional negation   | `!x` → `x`                                              |
| Logical operator       | `&&` → `\|\|`                                          |
| Equality               | `==` → `!=`                                             |
| Return value           | `return foo()` → `return null` / `return ""` / `return 0` |
| Statement removal       | `Foo();` → `;`                                          |
| String literal         | `"x"` → `""`                                            |

`mutation-level` controls how many of these run:

- `Basic` (fewest mutators)
- `Standard` (default, recommended)
- `Advanced`
- `Complete` (most mutators; slowest)

## Configuration options

Per [stryker-net-config][snc], every option nests under a single `stryker-config`
root object; Stryker.NET publishes no JSON schema, so there is no `$schema` key.
Core keys: `project`, `test-projects`, `mutation-level`, `thresholds` (`high` /
`low` / `break`), `concurrency`, `reporters`. Command-line flags mirror them, for
example `--solution` (multi-project discovery), `--project`, `--mutate` (scope /
exclude files), and `--break-at <baseline>` for the CI gate.

[snc]: https://stryker-mutator.io/docs/stryker-net/configuration/
