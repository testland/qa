---
name: linear-bug-workflow-runner
description: "Author and run Linear bug workflows via the GraphQL API: issue creation, state transitions (workflowState assignment), priority assignment (0 No priority / 1 Urgent / 2 High / 3 Medium / 4 Low), label-based classification, search by team and content. Covers the issueCreate mutation, issueUpdate for state transitions, the workflowStates query for per-team state IDs, and Linear's API-key vs OAuth Bearer auth modes. Use when the target tracker is Linear specifically; for tool-agnostic CI gates name the tracker, and for other trackers use jira-bug-workflow-runner (Jira) or github-issues-bug-workflow (GitHub Issues). Distinct from qa-bug-repro, which is reproduction-focused."
---

# linear-bug-workflow-runner

## Overview

Linear's API is GraphQL-only. Unlike Jira's REST workflow engine,
Linear's lifecycle is driven by `WorkflowState` objects: each team
has its own states (Backlog / Todo / In Progress / In Review /
Done / Cancelled, plus team-specific additions). To transition a
defect, set its `stateId` to the target state's ID.

This skill wraps Linear's GraphQL API
([linear.app/developers/graphql](https://linear.app/developers/graphql))
for create / update / transition / search.

## When to use

- Filing a bug from a CI test failure (consumed by
  [`bug-report-from-failure`](../bug-report-from-failure/SKILL.md)).
- Transitioning bugs in bulk after a release.
- Backing the
  [`duplicate-defect-finder`](../../agents/duplicate-defect-finder.md)
  search backend for Linear-using teams.

## Authoring

### Authentication

Per Linear API docs, two auth modes:

```bash
# Personal API key (lin_api_*)
export LINEAR_KEY="lin_api_xxxxxxxxxxxxxxxxxx"

# Or OAuth bearer token
export LINEAR_TOKEN="<oauth-access-token>"
```

```python
HEADERS_KEY = {
    "Authorization": os.environ["LINEAR_KEY"],   # personal key, no Bearer
    "Content-Type": "application/json",
}
HEADERS_OAUTH = {
    "Authorization": f"Bearer {os.environ['LINEAR_TOKEN']}",
    "Content-Type": "application/json",
}
ENDPOINT = "https://api.linear.app/graphql"
```

Note: personal API keys use the `Authorization` header **without**
the `Bearer` prefix; OAuth tokens use `Bearer`. This is
unusual - many GraphQL APIs reject the bareword auth - confirmed
in Linear's quickstart.

### Create a bug

The `issueCreate` mutation per
[linear.app/developers/graphql](https://linear.app/developers/graphql):

```python
import requests, os

QUERY = """
mutation IssueCreate($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue { id identifier url state { name } }
  }
}
"""

def create_bug(team_id, title, description_md, priority, state_id, label_ids=None):
    variables = {
        "input": {
            "teamId": team_id,
            "title": title,
            "description": description_md,  # Markdown supported
            "priority": priority,            # 0=No, 1=Urgent, 2=High, 3=Med, 4=Low
            "stateId": state_id,             # initial state (e.g., "Backlog" or "Todo")
            "labelIds": label_ids or [],
        }
    }
    r = requests.post(ENDPOINT, json={"query": QUERY, "variables": variables},
                      headers=HEADERS_KEY)
    r.raise_for_status()
    data = r.json()
    if data.get("errors"):
        raise RuntimeError(data["errors"])
    return data["data"]["issueCreate"]["issue"]
```

### Priority integer values

Per Linear's published priority enum (visible across the GraphQL
schema and the dashboard tooltip):

| Integer | Label |
|---|---|
| 0 | No priority |
| 1 | Urgent |
| 2 | High |
| 3 | Medium |
| 4 | Low |

Reverse of what some might expect: 1 is **highest** urgency.

### Discover state IDs per team

State IDs are per-team. Look them up via `workflowStates` query:

```python
STATES_QUERY = """
query Workflow($teamId: String!) {
  workflowStates(filter: { team: { id: { eq: $teamId } } }) {
    nodes { id name type }
  }
}
"""

def get_states(team_id):
    r = requests.post(ENDPOINT,
        json={"query": STATES_QUERY, "variables": {"teamId": team_id}},
        headers=HEADERS_KEY)
    r.raise_for_status()
    return r.json()["data"]["workflowStates"]["nodes"]
```

Per the Linear quickstart docs the simpler form is:

```graphql
query { workflowStates { nodes { id name } } }
```

…which returns all states across all teams (filter required for
per-team).

`type` is one of `backlog`, `unstarted`, `started`, `completed`,
`canceled` - the canonical lifecycle bucket independent of the
state's display name.

### Transition (update state)

`issueUpdate` mutation:

```python
UPDATE_QUERY = """
mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
  issueUpdate(id: $id, input: $input) {
    success
    issue { id state { name } }
  }
}
"""

def transition(issue_id, new_state_id):
    variables = {"id": issue_id, "input": {"stateId": new_state_id}}
    r = requests.post(ENDPOINT, json={"query": UPDATE_QUERY, "variables": variables},
                      headers=HEADERS_KEY)
    r.raise_for_status()
    data = r.json()
    return data["data"]["issueUpdate"]["success"]
```

`issueUpdate` accepts the same input fields as `issueCreate`
(except `teamId` which is immutable) plus assignee, due date,
estimate, etc.

### Search

The `issues` query supports filter expressions:

```python
SEARCH_QUERY = """
query SearchIssues($filter: IssueFilter!) {
  issues(filter: $filter, first: 50) {
    nodes { id identifier title state { name } priority }
  }
}
"""

def find_dupes(team_id, title_text):
    r = requests.post(ENDPOINT,
        json={"query": SEARCH_QUERY, "variables": {"filter": {
            "team": {"id": {"eq": team_id}},
            "title": {"contains": title_text},
            "state": {"type": {"neq": "completed"}},
        }}},
        headers=HEADERS_KEY)
    r.raise_for_status()
    return r.json()["data"]["issues"]["nodes"]
```

Filter operators: `eq`, `neq`, `contains`, `startsWith`,
`endsWith`, plus comparison for numerics.

## Running

### Idempotent bug creation

```python
def create_or_attach(team_id, title, description):
    dupes = find_dupes(team_id, title)
    if dupes:
        # Comment on the existing issue rather than duplicate
        add_comment(dupes[0]["id"], f"Recurred: {description[:500]}")
        return dupes[0]["identifier"]
    todo_state = next(s for s in get_states(team_id) if s["type"] == "unstarted")
    return create_bug(team_id, title, description, priority=3,
                      state_id=todo_state["id"])["identifier"]
```

`add_comment` uses the `commentCreate` mutation (similar shape;
omitted for brevity).

### Resolve workflow-state by type

Many automation flows want "transition to whatever the team uses
as Done" without hard-coding state names:

```python
def transition_to_completed(issue_id, team_id):
    done = next(s for s in get_states(team_id) if s["type"] == "completed")
    return transition(issue_id, done["id"])
```

The `type` enum is stable; the `name` is team-customisable.

## Parsing results

`issueCreate.issue.identifier` is the human-readable ID (e.g.,
`ENG-1234`). `issueCreate.issue.url` is the canonical permalink.

## CI integration

```yaml
- name: File Linear bug on failure
  if: failure()
  env:
    LINEAR_KEY: ${{ secrets.LINEAR_KEY }}
    LINEAR_TEAM_ID: ${{ vars.LINEAR_TEAM_ID }}
  run: python scripts/file-linear-bug.py results.xml
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `Authorization: Bearer <lin_api_*>` | Wrong header format for personal keys | Personal keys: header **without** Bearer; OAuth: header **with** Bearer |
| Hard-coded state names ("Done") | Team-renamed states break the runner | Resolve by `type` (canonical) not `name` (display) |
| Priority 1 = "low" | Reversed expectation; 1 = Urgent in Linear | Document the enum; use the constant table |
| Plain-text in `description` field | Markdown is accepted but Linear renders blocks differently than Jira | Test rendering for code blocks / tables |
| Single workflowStates query for all teams | High latency on large workspaces; data overflow | Filter by `team` |
| No dedupe before create | Same flaky test generates many issues | Search by title contains; comment-attach |
| Querying `state { name }` instead of `state { type }` | Filter logic breaks when team renames states | Query `type` for stability |

## Limitations

- **GraphQL learning curve.** Engineers used to REST may write
  noisy queries that over-fetch.
- **State `type` enum is small.** Five values cover the lifecycle;
  fine-grained sub-states (e.g., "Code Review" vs "In Progress")
  share `type: started`. Use `name` + `type` together when
  needed.
- **Webhook complement.** For event-driven workflows
  (notification on state change), pair with Linear webhooks
  rather than polling.
- **Personal API key bypasses 2FA** - use OAuth bearer for
  user-impersonating flows.
- **Rate limits.** ~1500 requests / 15 min per token; bulk
  operations need throttling.

## References

- Linear GraphQL API quickstart - 
  [linear.app/developers/graphql](https://linear.app/developers/graphql).
- Linear API overview - 
  [linear.app/developers](https://linear.app/developers).
- Linear GraphQL schema (Apollo Studio) - referenced from the
  developer docs.
- Sibling references:
  [`bug-lifecycle-reference`](../bug-lifecycle-reference/SKILL.md),
  [`severity-vs-priority-reference`](../severity-vs-priority-reference/SKILL.md).
- Sibling skills:
  [`jira-bug-workflow-runner`](../jira-bug-workflow-runner/SKILL.md),
  [`github-issues-bug-workflow`](../github-issues-bug-workflow/SKILL.md).
- Consumed by:
  [`bug-report-from-failure`](../bug-report-from-failure/SKILL.md),
  [`duplicate-defect-finder`](../../agents/duplicate-defect-finder.md).
