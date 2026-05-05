---
name: mutmut-mutation
description: Configures mutmut for Python mutation testing — `pip install mutmut`, runs via `mutmut run`, browses results via `mutmut browse` or `mutmut results`, applies surviving mutants to disk via `mutmut apply <id>`, suppresses with `# pragma: no mutate` annotations. Configures via `setup.cfg` / `pyproject.toml` with `source_paths` + per-test selection. Use for Python codebases needing mutation-quality verification of pytest / unittest suites.
rating: 22
d6: 4
archetype: S1
---

# mutmut-mutation

## Overview

Per [mutmut-docs][md]:

[md]: https://mutmut.readthedocs.io/en/latest/

> "**Mutmut** is a Python mutation testing system" with "a strong
> focus on ease of use." ([mutmut-docs][md])

Key features per [mutmut-docs][md]:

- "Apply found mutants to disk with simple commands"
- "Incremental work via remembered progress"
- "Intelligent test selection for faster execution"
- "Interactive terminal-based UI"
- "Parallel and fast execution"

## When to use

- A Python codebase has a pytest / unittest suite with high coverage
  and the team wants to verify the assertions.
- A specific module needs mutation-quality verification before
  shipping a release.
- The team is debating "should we add another test?" — surviving
  mutants tell you where.

## Step 1 — Install + first run

Per [mutmut-docs][md]:

```bash
pip install mutmut
mutmut run
```

`mutmut run` "automatically detects test folders ('tests' or
'test') and locates source code" ([mutmut-docs][md]).

The first run is slow (full suite per mutant); subsequent runs use
the cached state.

## Step 2 — Configure

Per [mutmut-docs][md], settings go in `setup.cfg` or
`pyproject.toml`:

```ini
[mutmut]
source_paths=src/
pytest_add_cli_args_test_selection=tests/
```

Or in `pyproject.toml`:

```toml
[tool.mutmut]
source_paths = ["src/"]
pytest_add_cli_args_test_selection = "tests/"
```

Common config:

| Setting                                | Use                                                       |
|----------------------------------------|-----------------------------------------------------------|
| `source_paths`                          | Which files to mutate.                                     |
| `pytest_add_cli_args_test_selection`    | Which tests to run per mutant.                            |
| `runner`                                | `pytest` (default) or `python -m unittest`.               |
| `tests_dir`                             | Override auto-detected test directory.                     |
| `do_not_mutate`                         | Regex of files / lines to skip.                            |

## Step 3 — Browse results

Per [mutmut-docs][md], "Results are explored via `mutmut browse`,
where mutants can be retested or written to disk using `mutmut
apply <mutant>`."

```bash
mutmut browse        # interactive TUI
mutmut results       # summary table
mutmut show <id>     # show specific mutant diff
```

Output:

```
Total: 142
Killed: 119 (83.8%)
Survived: 23 (16.2%)
Timeout: 0
Suspicious: 0
```

## Step 4 — Mutators

Per [mutmut-docs][md], common mutations include:

> "Integer literals are changed by adding 1. So 0 becomes 1, 5
> becomes 6, etc."
>
> `<` becomes `<=`
>
> `break` converts to `continue` and vice versa

Other mutators: arithmetic (`+` → `-`), comparison flipping,
constant replacement, statement removal.

## Step 5 — Suppress with pragmas

Per [mutmut-docs][md]:

> Use code comments to skip specific areas:
> - `# pragma: no mutate` (single line)
> - `# pragma: no mutate block` (indentation blocks)
> - `# pragma: no mutate start/end` (arbitrary ranges)

```python
def divide(a, b):
    if b == 0:                  # pragma: no mutate
        raise ZeroDivisionError("intentional unreachable")
    return a / b
```

Use sparingly — each pragma is a confession that a line isn't
mutation-tested. Reviewable in PRs.

## Step 6 — Apply a survivor

Once a surviving mutant is identified, write a test that catches
it. To verify the test catches this specific mutation:

```bash
mutmut apply <mutant-id>     # writes the mutant to disk
pytest tests/affected_test.py # the new test should fail
git checkout src/             # revert the mutant
```

This proves the test catches the specific bug class.

## Step 7 — CI integration

```yaml
- name: Mutation testing
  if: github.event_name == 'schedule'   # weekly
  run: |
    pip install -e '.[dev]'
    pip install mutmut
    mutmut run --max-children 4
- name: Surface results
  if: always()
  run: mutmut results > mutation-summary.txt
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: mutation-results
    path: mutation-summary.txt
```

For PRs, mutmut doesn't have native incremental mode; use
`source_paths` to scope to changed files via a wrapper script:

```bash
CHANGED=$(git diff --name-only origin/main...HEAD | grep '^src/')
mutmut run --paths-to-mutate "$CHANGED"
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| `# pragma: no mutate` as escape hatch                                 | Hides untested code; defeats mutation testing.                           | Reserve pragmas for genuinely unreachable / untestable code (Step 5). |
| Running on every PR (full mutation)                                   | Long; team disables.                                                      | Schedule weekly + per-PR scoped via wrapper (Step 7). |
| Including third-party packages in `source_paths`                      | Mutates code you don't own.                                              | Scope to project source only (Step 2). |
| Skipping `mutmut results` in CI                                       | No visibility into the score over time.                                  | Pipe to artifact + dashboard. |
| Setting unrealistic mutation-score gates                              | Forces team to write low-value tests.                                    | Start at current baseline; ratchet up by 1-2pp per quarter. |

## Limitations

- **Slow.** Even with parallel execution, full mutation runs take
  10-60 min on medium codebases.
- **No native PR diff scoping.** Use the wrapper pattern (Step 7).
- **Test framework hooks.** Some pytest fixtures interact oddly
  with mutated code; use `pragma: no mutate` for the specific
  fixtures.
- **Equivalent mutants.** Some mutations produce semantically
  identical code; impossible to kill. Identify and exclude.

## References

- [md][md] — mutmut overview: ease of use, incremental work,
  intelligent test selection, parallel execution, configuration via
  `setup.cfg` / `pyproject.toml`, mutator examples (integer
  literals, comparison flipping, break/continue).
- [`stryker-mutation`](../stryker-mutation/SKILL.md),
  [`stryker-net-mutation`](../stryker-net-mutation/SKILL.md),
  [`pitest-mutation`](../pitest-mutation/SKILL.md),
  [`mull-mutation`](../mull-mutation/SKILL.md) — per-language
  siblings.
- [`mutation-survivor-explainer`](../../agents/mutation-survivor-explainer.md)
  — agent that suggests the missing test for survivors.
