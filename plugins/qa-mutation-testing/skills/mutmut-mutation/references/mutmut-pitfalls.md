# mutmut - anti-patterns and limitations

Detailed pitfalls and constraints for `mutmut-mutation`. Linked inline from that skill's SKILL.md.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `# pragma: no mutate` as escape hatch | Hides untested code; defeats mutation testing. | Reserve pragmas for genuinely unreachable / untestable code. |
| Running on every PR (full mutation) | Long; team disables. | Schedule weekly + per-PR scoped via a wrapper script. |
| Including third-party packages in `source_paths` | Mutates code you don't own. | Scope to project source only. |
| Skipping `mutmut results` in CI | No visibility into the score over time. | Pipe to an artifact + dashboard. |
| Setting unrealistic mutation-score gates | Forces the team to write low-value tests. | Start at the current baseline; ratchet up by 1-2pp per quarter. |

## Limitations

- Slow. Even with parallel execution, full mutation runs take 10-60 min on medium codebases.
- No native PR diff scoping. Use the wrapper pattern: `git diff` -> `--paths-to-mutate`.
- Test framework hooks. Some pytest fixtures interact oddly with mutated code; use `pragma: no mutate` for the specific fixtures.
- Equivalent mutants. Some mutations produce semantically identical code; impossible to kill. Identify and exclude.
