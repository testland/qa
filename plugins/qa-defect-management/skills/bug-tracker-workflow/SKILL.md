---
name: bug-tracker-workflow
description: "Repairs defect bookkeeping that reports the wrong numbers - a weekly summary showing zero in the top severity band, a 'new defects this week' figure counting items already fixed, duplicates that were never merged, or one script moving issues across several boards whose workflows disagree. Files, transitions, dedupes, and searches bugs through one tracker-agnostic workflow across Jira, Linear, GitHub Issues, and Azure DevOps: authenticate, dedupe-search before creating, classify severity and priority, transition lifecycle states, and wire idempotent CI-driven filing from test failures. Jira Cloud REST API v3 is worked in full in the body (ADF descriptions, runtime transition lookup, JQL triage and duplicate queries, dry-run bulk transitions). Use when tracker data, defect metrics, or cross-board transitions are wrong or need automating."
---

# bug-tracker-workflow

## Overview

Every mainstream tracker exposes the same four core operations - **create**,
**transition**, **search**, and **update/comment** - behind a different API
shape. This skill runs the bug workflow tracker-agnostically, with Jira Cloud
REST API v3 worked in full below and per-platform deep dives in references:

| Tracker | API shape | Lifecycle model | Deep dive |
|---|---|---|---|
| **Jira Cloud** | REST v3, ADF rich text | Configurable workflow engine; look up transition IDs at runtime | Worked below + [references/jira.md](references/jira.md) |
| **Linear** | GraphQL only | Per-team `WorkflowState` objects; resolve by `type`, not display name | [references/linear.md](references/linear.md) |
| **GitHub Issues** | REST + Projects v2 GraphQL | Two states (open/closed) + `state_reason`; severity/priority via labels | [references/github-issues.md](references/github-issues.md) |
| **Azure DevOps** | WIT REST 7.1, JSON Patch | Process-template states (Agile: New/Active/Resolved/Closed); WIQL search | [references/azuredevops.md](references/azuredevops.md) |

The tracker-agnostic rules that hold on all four platforms:

- **Dedupe before create.** CI bug filing must not duplicate when the same
  failure recurs: search open bugs by title/summary first, comment on the
  existing bug on a hit, and fail closed (skip the create, surface the
  error) if the search itself errors.
- **Severity and priority are different axes** - keep both fields and score
  them independently (`severity-vs-priority-reference`).
- **Never hard-code lifecycle identifiers.** Jira transition IDs, Linear
  state names, and ADO state strings are all tenant/team/process-specific -
  discover them at runtime.
- **Dry-run bulk operations.** Bulk transitions are not trivially
  reversible; log the plan and verify counts before applying.
- **Secrets in env vars / secret stores**, never in code.

## When to use

- Filing a bug from a CI test failure (fed by the from-CI-failure workflow
  in `bug-report-template`, qa-bug-repro).
- Bulk-transitioning bugs after a release.
- Building a triage script that pulls new defects and applies severity /
  priority based on labels.
- Backing a duplicate-defect search backend.

## Worked primary - Jira Cloud REST API v3

Jira's workflow engine maps cleanly to the canonical defect lifecycle (see
the lifecycle reference in `severity-vs-priority-reference`), but every
project's actual workflow is configurable, so the runner looks up transition
IDs at runtime rather than hard-coding them. All calls per
[developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/).

### Authentication

Jira Cloud REST API v3 uses HTTP Basic auth with an API token:

```bash
export JIRA_BASE="https://your-tenant.atlassian.net"
export JIRA_EMAIL="you@company.com"
export JIRA_TOKEN="<api-token-from-id.atlassian.com>"
```

```python
import requests, base64, os

auth = base64.b64encode(
    f"{os.environ['JIRA_EMAIL']}:{os.environ['JIRA_TOKEN']}".encode()
).decode()
HEADERS = {
    "Authorization": f"Basic {auth}",
    "Accept": "application/json",
    "Content-Type": "application/json",
}
BASE = os.environ["JIRA_BASE"]
```

### Create a bug

`POST /rest/api/3/issue`. The `description` must be Atlassian Document
Format (ADF), not plain text.

```python
def create_bug(project_key, summary, description_text, severity, priority, labels):
    payload = {
        "fields": {
            "project": {"key": project_key},
            "summary": summary,
            "description": {
                "type": "doc",
                "version": 1,
                "content": [{
                    "type": "paragraph",
                    "content": [{"type": "text", "text": description_text}],
                }],
            },
            "issuetype": {"name": "Bug"},
            "priority": {"name": priority},   # e.g. "High"
            "labels": labels + [f"severity-{severity}"],
        }
    }
    r = requests.post(f"{BASE}/rest/api/3/issue", json=payload, headers=HEADERS)
    r.raise_for_status()
    return r.json()["key"]
```

Note: `severity` is typically a custom field - most tenants either define a
custom Severity field (`customfield_XXXXX`) or use labels
(`severity-critical`). The example uses labels for portability; discovering
and submitting the custom field is in [references/jira.md](references/jira.md).

### Look up and apply a transition

Workflow transitions are project-specific. Look up the available transitions
then apply by transition ID:

```python
def get_transitions(issue_key):
    r = requests.get(f"{BASE}/rest/api/3/issue/{issue_key}/transitions",
                     headers=HEADERS)
    r.raise_for_status()
    return r.json()["transitions"]

def transition(issue_key, target_state_name):
    transitions = get_transitions(issue_key)
    match = next((t for t in transitions if t["name"] == target_state_name), None)
    if not match:
        raise ValueError(f"No transition named {target_state_name}; "
                         f"available: {[t['name'] for t in transitions]}")
    r = requests.post(
        f"{BASE}/rest/api/3/issue/{issue_key}/transitions",
        json={"transition": {"id": match["id"]}},
        headers=HEADERS,
    )
    r.raise_for_status()
```

The `POST /rest/api/3/issue/{key}/transitions` body shape is
`{"transition": {"id": "<id>"}}` per the API group docs.

### Search via JQL

`POST /rest/api/3/search/jql` returns issues matching a JQL query. Useful
for duplicate detection and triage queues.

```python
def search_jql(jql, max_results=50):
    r = requests.post(
        f"{BASE}/rest/api/3/search/jql",
        json={"jql": jql, "fields": ["summary", "status", "priority"],
              "maxResults": max_results},
        headers=HEADERS,
    )
    r.raise_for_status()
    return r.json()["issues"]

# Triage queue:
triage = search_jql(
    'project = ENG AND issuetype = Bug AND status = "New" ORDER BY created ASC'
)

# Duplicate-candidate search:
dupes = search_jql(
    f'project = ENG AND text ~ "{summary_safe}" AND issuetype = Bug'
)
```

### Idempotent bug creation

```python
def create_or_attach(project, summary, body):
    existing = search_jql(
        f'project = {project} AND summary ~ "\\"{summary}\\"" '
        f'AND statusCategory != Done',
        max_results=5,
    )
    if existing:
        # Attach a comment to the existing bug instead of duplicating
        key = existing[0]["key"]
        add_comment(key, f"Recurred at {timestamp()}: {body[:500]}")
        return key
    return create_bug(project, summary, body, "Medium", "Medium",
                      labels=["auto-filed", "ci-failure"])
```

Verify: the `statusCategory != Done` search must run and return 0 open
matches before `create_bug` fires. If it returns a hit, comment on that key
instead of creating; if the search itself errors, fail closed (skip the
create and surface the error) rather than filing a possible duplicate.

### Bulk transition after release

Dry-run first: a mis-scoped JQL can push hundreds of issues into the wrong
state, and a transition is not trivially reversible. Gate the apply behind a
flag:

```python
DRY_RUN = True  # flip to False only after reviewing the logged plan

verified = search_jql(
    'project = ENG AND status = Verified AND fixVersion = "2026.05.20"',
    max_results=1000,
)
for issue in verified:
    if DRY_RUN:
        print(f"[dry-run] {issue['key']}: Verified -> Close Issue")
        continue
    transition(issue["key"], "Close Issue")
```

Verify: assert the dry-run count and keys match the issue set you intended
to close before flipping `DRY_RUN` to `False`; if they do not, fix the JQL
and re-run the dry run. `transition` already raises `ValueError` when the
named transition is absent for an issue's workflow, so a workflow mismatch
fails loud rather than silently skipping.

### CI integration

Auto-file a bug from a test failure:

```yaml
# .github/workflows/test.yml (excerpt)
- name: Run tests
  id: tests
  run: pytest --junitxml=results.xml
  continue-on-error: true

- name: File Jira bug on failure
  if: steps.tests.outcome == 'failure'
  env:
    JIRA_BASE: ${{ secrets.JIRA_BASE }}
    JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
    JIRA_TOKEN: ${{ secrets.JIRA_TOKEN }}
  run: python scripts/file-jira-bug.py results.xml
```

Where `file-jira-bug.py` parses the JUnit XML, extracts the failure,
deduplicates, and creates / comments per the helpers above.

Verify: assert the create call returned HTTP 2xx and a non-empty issue key
before the step reports success. On `400`, the `description` was likely
plain text instead of ADF or a required field is missing - fix the payload
and re-run. On `429` (rate limit), back off and retry rather than failing
the build. If it still fails, leave the test result red so the filing gap
stays visible instead of being swallowed.

## Other trackers

The same workflow shape on the other three platforms, each with its own
auth, create, transition, search, worked example, anti-patterns, and CI
wiring:

- **Linear** - [references/linear.md](references/linear.md): GraphQL-only
  API; `issueCreate` / `issueUpdate` mutations; per-team `workflowStates`
  resolved by lifecycle `type` (never display `name`); priority enum where
  1 = Urgent; personal-key vs OAuth Bearer header difference.
- **GitHub Issues** - [references/github-issues.md](references/github-issues.md):
  two states only; the canonical-lifecycle-to-labels mapping; `state_reason`
  transitions (completed / not_planned / duplicate / reopened); Projects v2
  GraphQL and the gh CLI.
- **Azure DevOps** - [references/azuredevops.md](references/azuredevops.md):
  JSON Patch work-item mutations (`application/json-patch+json`); WIQL
  triage / dedupe queries; process-template state names; optimistic
  concurrency via `test /rev`; PR / build artifact links; az boards CLI.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Hard-coding transition IDs / state names | Workflow or process-template updates break the runner silently | Discover at runtime (Jira `GET /transitions`, Linear `workflowStates` by `type`, ADO process template) |
| Plain-text `description` in Jira | API returns 400 - Jira v3 requires ADF | Wrap as `{"type": "doc", "version": 1, "content": [...]}` |
| No deduplication before create | Each retry of a flaky test creates a new bug | Search by summary first; comment on existing |
| Severity as built-in `priority` | Conflates two axes (`severity-vs-priority-reference`) | Use a custom Severity field or `severity-*` labels |
| Storing the API token in code | Token leak | Use environment variables / secret stores |
| Polling metadata endpoints on every call | Rate-limited | Cache per workflow scheme, refresh on 4xx |
| Bulk transitions without dry-run | Cannot easily reverse if wrong state | Always run in dry-run mode first; log all changes |

## Limitations

- **Workflow is per-project / per-team / per-process.** A transition or
  state name in one project may not exist in another - handle "not found"
  gracefully on every platform.
- **Custom fields are tenant-specific.** Jira field IDs
  (`customfield_10039`) and ADO severity availability vary; discover at
  deploy time.
- **Rich text differs per platform.** Jira needs full ADF; Linear takes
  Markdown; GitHub takes Markdown; ADO takes HTML. Test code-block / table
  rendering per platform.
- **Rate limits everywhere.** Jira per-minute, Linear ~1500 req/15 min,
  GitHub search 30 req/min unauthenticated, ADO per-user throttling - bulk
  operations need throttling and retry-with-backoff.
- **Query injection.** JQL `text ~`, WIQL `CONTAINS WORDS`, and GitHub
  search all interpolate user text - escape quotes and reserved characters.

## References

- Jira Cloud REST API v3 issues -
  [developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/).
- Jira Cloud authentication -
  developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis.
- ADF spec - developer.atlassian.com/cloud/jira/platform/apis/document/structure.
- JQL syntax - confluence.atlassian.com/jiracoreserver/advanced-searching.
- Per-platform deep dives: [references/jira.md](references/jira.md),
  [references/linear.md](references/linear.md),
  [references/github-issues.md](references/github-issues.md),
  [references/azuredevops.md](references/azuredevops.md) - each carries its
  own platform-doc citations.
- Sibling reference: `severity-vs-priority-reference` (classification,
  lifecycle states, taxonomy).
- Fed by: the from-CI-failure spec workflow in `bug-report-template`
  (qa-bug-repro).
- Sibling-plugin neighbour: `test-management-sync` (in the
  qa-test-reporting plugin) - different scope (test-result posting; not bug
  workflow).
