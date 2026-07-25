# Linear GraphQL deep reference

Deep reference for `linear-bug-workflow-runner` SKILL.md. Consult when resolving
a workflow state by its lifecycle `type` without hard-coding names, discovering
states across all teams, wiring CI to file bugs on failure, or parsing the
identifiers returned by `issueCreate`.

## Resolve workflow-state by type

Many automation flows want "transition to whatever the team uses
as Done" without hard-coding state names. Resolve the target state
by its lifecycle `type`, then reuse the `transition` helper from the
SKILL:

```python
def transition_to_completed(issue_id, team_id):
    done = next(s for s in get_states(team_id) if s["type"] == "completed")
    return transition(issue_id, done["id"])
```

The `type` enum (`backlog`, `unstarted`, `started`, `completed`,
`canceled`) is stable; the `name` is team-customisable, so resolving
by `type` survives a team renaming its columns.

## Discover states across all teams

Per the Linear quickstart docs the simpler, unfiltered form is:

```graphql
query { workflowStates { nodes { id name } } }
```

...which returns all states across all teams. Prefer the per-team
filtered query in the SKILL - the unfiltered form has high latency on
large workspaces and returns far more nodes than a single flow needs.

## Parsing results

`issueCreate.issue.identifier` is the human-readable ID (e.g.,
`ENG-1234`). `issueCreate.issue.url` is the canonical permalink.
GraphQL errors surface under a top-level `errors` array even on an
HTTP 200 - check `data.get("errors")` before reading `data["data"]`.

## CI integration

```yaml
- name: File Linear bug on failure
  if: failure()
  env:
    LINEAR_KEY: ${{ secrets.LINEAR_KEY }}
    LINEAR_TEAM_ID: ${{ vars.LINEAR_TEAM_ID }}
  run: python scripts/file-linear-bug.py results.xml
```

`file-linear-bug.py` reads the JUnit XML, extracts the first failure,
deduplicates via `find_dupes`, and calls `create_or_attach`.
