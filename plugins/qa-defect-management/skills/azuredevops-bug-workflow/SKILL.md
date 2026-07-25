---
name: azuredevops-bug-workflow
description: "Authors and triages Bug work items in Azure DevOps Boards via the Work Item Tracking REST API (api-version 7.1) - Bug creation with JSON Patch, state transitions across New/Active/Resolved/Closed, and WIQL queries for triage queues and duplicate detection. Deep operational blocks (field-value fetch, PR / build artifact links, bulk close, az boards CLI, CI wiring) live in references/. Use when programmatically managing Azure DevOps Bug lifecycle states: creating from CI failures, triaging open defect queues, transitioning states in bulk, or attaching traceability links to builds and pull requests."
---

# azuredevops-bug-workflow

## Overview

Azure DevOps Boards models defects as Bug work items with a fixed set of built-in
states (`bug-lifecycle-reference`).
The canonical state sequence for the Agile process template is
New -> Active -> Resolved -> Closed, per
[learn.microsoft.com/en-us/azure/devops/boards/work-items/guidance/agile-process-workflow](https://learn.microsoft.com/en-us/azure/devops/boards/work-items/guidance/agile-process-workflow).

All mutations use the Work Item Tracking REST API (api-version 7.1) with a
JSON Patch body, per
[learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create?view=azure-devops-rest-7.1).

## When to use

- Filing a Bug from a CI test failure (consumed by
  `bug-report-from-failure`).
- Building a triage script that pulls New defects and applies priority
  or assigns to the on-call engineer.
- Bulk-transitioning Resolved bugs to Closed after a release.
- Backing a duplicate-detection search backend for ADO-using teams.

## How to use

1. Authenticate with a PAT via HTTP Basic and set `Content-Type: application/json-patch+json` (see Authentication).
2. Before creating, dedupe against open Bugs with a WIQL `CONTAINS WORDS` query (see Search via WIQL).
3. Create the Bug with a JSON Patch document, then transition its `System.State` as the fix progresses (see Create / Transition).
4. Attach traceability links, batch-fetch fields, bulk-close, or wire CI - all in [references/azure-devops-wit-reference.md](references/azure-devops-wit-reference.md).

## Authentication

The API supports Personal Access Tokens (PAT) via HTTP Basic auth, where the
username is empty and the password is the PAT. Scope required:
`vso.work_write` (grants read, create, and update of work items), per the
[Work Items - Create security docs](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create?view=azure-devops-rest-7.1#security).

```bash
export ADO_ORG="https://dev.azure.com/my-org"
export ADO_PROJECT="MyProject"
export ADO_PAT="<personal-access-token>"
export ADO_AUTH=$(echo -n ":$ADO_PAT" | base64)
```

```python
import requests, base64, os

pat = os.environ["ADO_PAT"]
token = base64.b64encode(f":{pat}".encode()).decode()
HEADERS = {
    "Authorization": f"Basic {token}",
    "Content-Type": "application/json-patch+json",
    "Accept": "application/json",
}
BASE = os.environ["ADO_ORG"]
PROJECT = os.environ["ADO_PROJECT"]
```

Note: the `Content-Type` for all write operations is
`application/json-patch+json`, not `application/json`. Sending
`application/json` returns HTTP 415.

## Create a Bug

`POST {org}/{project}/_apis/wit/workitems/$Bug?api-version=7.1` per
[learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create?view=azure-devops-rest-7.1).
The body is a JSON Patch document (array of operations).

Core Bug fields per the Agile process template
([learn.microsoft.com/en-us/azure/devops/boards/work-items/guidance/agile-process-workflow](https://learn.microsoft.com/en-us/azure/devops/boards/work-items/guidance/agile-process-workflow)):

| Field reference name | Purpose | Example value |
|---|---|---|
| `System.Title` | Summary | `"Login fails on SSO redirect"` |
| `System.Description` | Repro steps (HTML) | `"<b>Steps:</b><ol>..."` |
| `Microsoft.VSTS.Common.Priority` | Priority 1-4 | `2` |
| `Microsoft.VSTS.Common.Severity` | Severity (process-defined) | `"2 - High"` |
| `System.AssignedTo` | Triage assignee | `"user@company.com"` |
| `System.Tags` | Labels | `"ci-failure; regression"` |

```python
def create_bug(title, description_html, priority, severity, tags=""):
    body = [
        {"op": "add", "path": "/fields/System.Title", "value": title},
        {"op": "add", "path": "/fields/System.Description",
         "value": description_html},
        {"op": "add", "path": "/fields/Microsoft.VSTS.Common.Priority",
         "value": priority},
        {"op": "add", "path": "/fields/Microsoft.VSTS.Common.Severity",
         "value": severity},
        {"op": "add", "path": "/fields/System.Tags", "value": tags},
    ]
    r = requests.post(
        f"{BASE}/{PROJECT}/_apis/wit/workitems/$Bug?api-version=7.1",
        json=body, headers=HEADERS,
    )
    r.raise_for_status()
    item = r.json()
    return item["id"], item["url"]
```

The response `id` field is the work item integer ID. Construct the browser URL
as `{BASE}/{PROJECT}/_workitems/edit/{id}`.

## Transition state (PATCH)

State transitions use `PATCH {org}/{project}/_apis/wit/workitems/{id}?api-version=7.1`
with a `replace` or `add` operation on `/fields/System.State`, per
[learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/update](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/update?view=azure-devops-rest-7.1).

Unlike Jira, ADO has no separate "transitions" endpoint. Set the target state
string directly. Valid values for the Agile Bug type are
`New`, `Active`, `Resolved`, and `Closed`.

The optional `test` op on `/rev` provides optimistic concurrency: the server
rejects the patch if the revision no longer matches, preventing lost updates.

```python
def set_state(work_item_id, target_state, current_rev=None):
    body = []
    if current_rev is not None:
        body.append({"op": "test", "path": "/rev", "value": current_rev})
    body.append(
        {"op": "add", "path": "/fields/System.State", "value": target_state}
    )
    r = requests.patch(
        f"{BASE}/{PROJECT}/_apis/wit/workitems/{work_item_id}?api-version=7.1",
        json=body, headers=HEADERS,
    )
    r.raise_for_status()
    return r.json()["fields"]["System.State"]
```

To also record who resolved and why:

```python
body += [
    {"op": "add", "path": "/fields/Microsoft.VSTS.Common.ResolvedReason",
     "value": "Fixed"},
    {"op": "add", "path": "/fields/System.History",
     "value": "Resolved in PR #1234"},
]
```

## Search via WIQL

`POST {org}/{project}/_apis/wit/wiql?api-version=7.1` runs a Work Item Query
Language expression, per
[learn.microsoft.com/en-us/rest/api/azure/devops/wit/wiql/query-by-wiql](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/wiql/query-by-wiql?view=azure-devops-rest-7.1).
The request body is `{"query": "<WIQL string>"}`. The response `workItems` array
contains `{id, url}` objects; batch-fetch field values with a second call (see
[references/azure-devops-wit-reference.md](references/azure-devops-wit-reference.md)).

```python
def wiql_search(query, top=50):
    r = requests.post(
        f"{BASE}/{PROJECT}/_apis/wit/wiql?$top={top}&api-version=7.1",
        json={"query": query},
        headers={**HEADERS, "Content-Type": "application/json"},
    )
    r.raise_for_status()
    return r.json().get("workItems", [])   # [{id, url}, ...]

# Triage queue: all open Bugs ordered by priority then created date
triage_items = wiql_search(
    "SELECT [System.Id] FROM WorkItems "
    "WHERE [System.WorkItemType] = 'Bug' "
    "AND [System.State] NOT IN ('Resolved', 'Closed') "
    "ORDER BY [Microsoft.VSTS.Common.Priority] ASC, "
    "[System.CreatedDate] DESC"
)

# Duplicate candidate search
dupes = wiql_search(
    f"SELECT [System.Id] FROM WorkItems "
    f"WHERE [System.WorkItemType] = 'Bug' "
    f"AND [System.Title] CONTAINS WORDS 'SSO redirect' "
    f"AND [System.State] <> 'Closed'"
)
```

WIQL `CONTAINS WORDS` is a full-text operator. Do not substitute user input
directly; sanitise by stripping WIQL reserved characters (`[`, `]`, `'`) before
interpolating into the query string.

## Worked example

File a Bug from a nightly pytest failure, deduped, then resolve it after the
fix ships. This reuses `create_bug`, `wiql_search`, and `set_state` above:

```python
# 1. Extract the failure (title + HTML repro) from the JUnit XML.
title = "Login fails on SSO redirect"
repro = "<b>Steps:</b><ol><li>Sign in via SSO</li><li>Redirect 500s</li></ol>"

# 2. Dedupe: search open Bugs by title before creating.
hits = wiql_search(
    "SELECT [System.Id] FROM WorkItems "
    "WHERE [System.WorkItemType] = 'Bug' "
    f"AND [System.Title] CONTAINS WORDS '{title}' "
    "AND [System.State] <> 'Closed'", top=5)

# 3. Create only if no open duplicate exists; otherwise comment on the
#    existing item (add_comment lives in references).
if hits:
    bug_id = hits[0]["id"]
else:
    bug_id, _ = create_bug(title, repro, priority=2, severity="2 - High",
                           tags="ci-failure; regression")
    print(f"Filed {BASE}/{PROJECT}/_workitems/edit/{bug_id}")

# 4. After the fix merges, transition New/Active -> Resolved.
set_state(bug_id, "Resolved")   # add ResolvedReason + History as shown above
```

The packaged idempotent CI filer (`create_or_comment` + `add_comment`), plus
bulk close, artifact links, and pipeline wiring, are in
[references/azure-devops-wit-reference.md](references/azure-devops-wit-reference.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Sending `Content-Type: application/json` on create/update | API returns HTTP 415 | Use `application/json-patch+json` for all PATCH/POST to `workitems` |
| Hard-coding state strings like `"In Progress"` | State names are process-template-specific (Agile vs Scrum vs CMMI) | Verify state names for the target project's process template before automating |
| No `test /rev` op on concurrent updates | Overwrites changes made between read and write | Add `{"op": "test", "path": "/rev", "value": rev}` as the first operation |
| Direct WIQL string interpolation of user input | WIQL injection via reserved chars (`'`, `[`, `]`) | Strip or escape reserved characters before interpolating |
| Ignoring `$top` truncation on WIQL responses | Silently misses items when the queue exceeds the cap | Check `len(hits) == top`; paginate or increase `$top` (max 20 000) |
| Building `vstfs:///` URIs without project/repo GUIDs | Artifact links silently fail or link to the wrong target | Fetch `projectId` and `repoId` from the Repos API first |
| Creating a Bug per flaky-test recurrence | Pollutes the backlog | Always comment on the existing open bug instead of filing a new one |
| Storing the PAT in source code | Token leak | Use environment variables or Azure Key Vault secret references |

## Limitations

- **Process-template state names vary.** Agile uses `Active`; Scrum uses
  `Committed`; CMMI uses `Active` with additional substates. Query the
  process template for the project before hard-coding state strings.
- **Severity field depends on process template.** Agile and CMMI include
  `Microsoft.VSTS.Common.Severity`; Scrum does not by default. Use
  `GET /_apis/wit/workitemtypes/Bug/fields` to verify field availability.
- **Comments API is preview.** The `workItems/{id}/comments` endpoint is
  `api-version 7.1-preview.3` and its contract may change.
- **Artifact link URIs require project and repo GUIDs.** Display names are
  not accepted; resolve them via `GET /_apis/projects` and
  `GET /_apis/git/repositories` first.
- **Rate limits.** Azure DevOps Services enforces per-user and per-IP
  throttling; bulk operations need retry-with-backoff on HTTP 429.

## References

- Work Items - Create (api-version 7.1):
  [learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create?view=azure-devops-rest-7.1).
- Work Items - Update (api-version 7.1):
  [learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/update](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/update?view=azure-devops-rest-7.1).
- Wiql - Query By Wiql (api-version 7.1):
  [learn.microsoft.com/en-us/rest/api/azure/devops/wit/wiql/query-by-wiql](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/wiql/query-by-wiql?view=azure-devops-rest-7.1).
- Agile process workflow (Bug state model):
  [learn.microsoft.com/en-us/azure/devops/boards/work-items/guidance/agile-process-workflow](https://learn.microsoft.com/en-us/azure/devops/boards/work-items/guidance/agile-process-workflow).
- Deep operational reference (field fetch, artifact links, bulk close, az CLI,
  CI wiring, with their own citations):
  [references/azure-devops-wit-reference.md](references/azure-devops-wit-reference.md).
- Sibling references:
  `bug-lifecycle-reference`,
  `severity-vs-priority-reference`.
- Sibling skills:
  `jira-bug-workflow-runner`,
  `linear-bug-workflow-runner`,
  `github-issues-bug-workflow`.
- Consumed by:
  `bug-report-from-failure`.
