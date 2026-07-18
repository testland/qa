---
name: azuredevops-bug-workflow
description: "Authors and triages Bug work items in Azure DevOps Boards via the Work Item Tracking REST API (api-version 7.1) - Bug creation with JSON Patch, state transitions across New/Active/Resolved/Closed, WIQL queries for triage queues and duplicate detection, linking to PRs and builds via System.LinkTypes.Related and ArtifactLink relations, and the az boards CLI for scripted workflows. Use when programmatically managing Azure DevOps Bug lifecycle states: creating from CI failures, triaging open defect queues, transitioning states in bulk, or attaching traceability links to builds and pull requests."
---

# azuredevops-bug-workflow

## Overview

Azure DevOps Boards models defects as Bug work items with a fixed set of built-in
states ([`bug-lifecycle-reference`](../bug-lifecycle-reference/SKILL.md)).
The canonical state sequence for the Agile process template is
New -> Active -> Resolved -> Closed, per
[learn.microsoft.com/en-us/azure/devops/boards/work-items/guidance/agile-process-workflow](https://learn.microsoft.com/en-us/azure/devops/boards/work-items/guidance/agile-process-workflow).

All mutations use the Work Item Tracking REST API (api-version 7.1) with a
JSON Patch body, per
[learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create?view=azure-devops-rest-7.1).

## When to use

- Filing a Bug from a CI test failure (consumed by
  [`bug-report-from-failure`](../bug-report-from-failure/SKILL.md)).
- Building a triage script that pulls New defects and applies priority
  or assigns to the on-call engineer.
- Bulk-transitioning Resolved bugs to Closed after a release.
- Backing a duplicate-detection search backend for ADO-using teams.

## Authoring

### Authentication

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

### Create a Bug

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

### Transition state (PATCH)

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

### Search via WIQL

`POST {org}/{project}/_apis/wit/wiql?api-version=7.1` runs a Work Item Query
Language expression, per
[learn.microsoft.com/en-us/rest/api/azure/devops/wit/wiql/query-by-wiql](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/wiql/query-by-wiql?view=azure-devops-rest-7.1).
The request body is `{"query": "<WIQL string>"}`. The response `workItems` array
contains `{id, url}` objects; a second call to
`GET /_apis/wit/workitems?ids=...` is needed to fetch field values.

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

### Fetch field values after a WIQL query

The WIQL response only returns IDs. Batch-fetch fields with:

```python
def get_work_items(ids, fields=None):
    if not ids:
        return []
    fields_param = ",".join(fields) if fields else (
        "System.Id,System.Title,System.State,"
        "Microsoft.VSTS.Common.Priority,Microsoft.VSTS.Common.Severity"
    )
    ids_param = ",".join(str(i["id"]) for i in ids)
    r = requests.get(
        f"{BASE}/_apis/wit/workitems"
        f"?ids={ids_param}&fields={fields_param}&api-version=7.1",
        headers={**HEADERS, "Content-Type": "application/json"},
    )
    r.raise_for_status()
    return r.json()["value"]
```

### Linking to PRs and builds

Work item relations are attached via a `PATCH` operation with `op: add` on
`/relations/-`, per
[learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/update](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/update?view=azure-devops-rest-7.1)
(see the "Add a link" example in the API docs). The relation value object
contains `rel` (link type name) and `url` (target URL).

Link another work item as related:

```python
def link_related(source_id, target_id, comment=""):
    target_url = f"{BASE}/_apis/wit/workItems/{target_id}"
    body = [{
        "op": "add",
        "path": "/relations/-",
        "value": {
            "rel": "System.LinkTypes.Related",
            "url": target_url,
            "attributes": {"comment": comment},
        }
    }]
    r = requests.patch(
        f"{BASE}/{PROJECT}/_apis/wit/workitems/{source_id}?api-version=7.1",
        json=body, headers=HEADERS,
    )
    r.raise_for_status()
```

Link a pull request or build (artifact link). The `url` for artifact links
uses the `vstfs:///` URI scheme. For a Git pull request the relation type is
`ArtifactLink`, per
[learn.microsoft.com/en-us/azure/devops/boards/queries/link-type-reference](https://learn.microsoft.com/en-us/azure/devops/boards/queries/link-type-reference):

```python
def link_pull_request(work_item_id, org_name, project_id, repo_id, pr_id):
    # vstfs artifact URI format for a Git PR:
    # vstfs:///Git/PullRequestId/{projectId}/{repoId}/{prId}
    artifact_url = (
        f"vstfs:///Git/PullRequestId/{project_id}/{repo_id}/{pr_id}"
    )
    body = [{
        "op": "add",
        "path": "/relations/-",
        "value": {
            "rel": "ArtifactLink",
            "url": artifact_url,
            "attributes": {
                "name": "Pull Request",
                "comment": f"Fixing PR !{pr_id}",
            },
        }
    }]
    r = requests.patch(
        f"{BASE}/{PROJECT}/_apis/wit/workitems/{work_item_id}?api-version=7.1",
        json=body, headers=HEADERS,
    )
    r.raise_for_status()
```

Use `az boards work-item relation list-type` to enumerate all supported link
type names for the current organisation, per
[learn.microsoft.com/en-us/azure/devops/boards/backlogs/add-link](https://learn.microsoft.com/en-us/azure/devops/boards/backlogs/add-link?view=azure-devops).

## Running

### Idempotent bug creation from CI

Search before creating to prevent duplicate defects (per the
canonical defect lifecycle guidance in
[`bug-lifecycle-reference`](../bug-lifecycle-reference/SKILL.md)):

```python
def create_or_comment(title, body_html, priority="2", severity="2 - High"):
    hits = wiql_search(
        f"SELECT [System.Id] FROM WorkItems "
        f"WHERE [System.WorkItemType] = 'Bug' "
        f"AND [System.Title] CONTAINS WORDS '{title[:60]}' "
        f"AND [System.State] <> 'Closed'",
        top=5,
    )
    if hits:
        existing_id = hits[0]["id"]
        add_comment(existing_id, f"Recurred: {body_html[:500]}")
        return existing_id, False   # (id, created)
    item_id, _ = create_bug(title, body_html, priority, severity,
                            tags="ci-failure; auto-filed")
    return item_id, True

def add_comment(work_item_id, text_html):
    r = requests.post(
        f"{BASE}/{PROJECT}/_apis/wit/workItems/{work_item_id}"
        f"/comments?api-version=7.1-preview.3",
        json={"text": text_html},
        headers={**HEADERS, "Content-Type": "application/json"},
    )
    r.raise_for_status()
```

### Bulk close after release

```python
resolved = wiql_search(
    "SELECT [System.Id] FROM WorkItems "
    "WHERE [System.WorkItemType] = 'Bug' "
    "AND [System.State] = 'Resolved' "
    "AND [System.IterationPath] UNDER 'MyProject\\\\Sprint 42'"
)
for item in resolved:
    set_state(item["id"], "Closed")
```

### az boards CLI

The `az boards` CLI (part of `azure-devops` Azure CLI extension) wraps the same
REST API. Install with `az extension add --name azure-devops`.

```bash
# Create a Bug
az boards work-item create \
  --type Bug \
  --title "Login fails on SSO redirect" \
  --priority 2 \
  --org "$ADO_ORG" \
  --project "$ADO_PROJECT"

# Update state
az boards work-item update --id 4210 --state Active \
  --org "$ADO_ORG" --project "$ADO_PROJECT"

# Link two work items
az boards work-item relation add --id 4210 \
  --relation-type Related --target-id 4205 \
  --org "$ADO_ORG"

# WIQL query (returns JSON)
az boards query \
  --wiql "SELECT [System.Id],[System.Title] FROM WorkItems \
    WHERE [System.WorkItemType]='Bug' AND [System.State]='New'" \
  --org "$ADO_ORG" --project "$ADO_PROJECT"
```

## Parsing results

`create_bug` returns `(id, url)`. Build the browser permalink:

```python
permalink = f"{BASE}/{PROJECT}/_workitems/edit/{work_item_id}"
```

`wiql_search` returns `[{id, url}, ...]`. Always check the list length before
accessing index 0, and compare against the `$top` cap to detect truncation.
`get_work_items` returns the full field map per item under `value[].fields`.

## CI integration

```yaml
# azure-pipelines.yml (excerpt)
- task: PythonScript@0
  displayName: "File ADO bug on test failure"
  condition: failed()
  inputs:
    scriptSource: filePath
    scriptPath: scripts/file-ado-bug.py
  env:
    ADO_ORG: $(System.CollectionUri)
    ADO_PROJECT: $(System.TeamProject)
    ADO_PAT: $(ADO_PAT_SECRET)
    BUILD_ID: $(Build.BuildId)
    BUILD_URL: $(System.CollectionUri)$(System.TeamProject)/_build/results?buildId=$(Build.BuildId)
```

`file-ado-bug.py` reads the JUnit XML produced by the test runner, extracts
the first failure, deduplicates against open Bugs, and calls `create_or_comment`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Sending `Content-Type: application/json` on create/update | API returns HTTP 415 | Use `application/json-patch+json` for all PATCH/POST to `workitems` |
| Hard-coding state strings like `"In Progress"` | State names are process-template-specific (Agile vs Scrum vs CMMI) | Verify state names for the target project's process template before automating |
| No `test /rev` op on concurrent updates | Overwrites changes made between read and write | Add `{"op": "test", "path": "/rev", "value": rev}` as the first operation |
| Direct WIQL string interpolation of user input | WIQL injection via reserved chars (`'`, `[`, `]`) | Strip or escape reserved characters before interpolating |
| Ignoring `$top` truncation on WIQL responses | Silently misses items when the queue exceeds the cap | Check `len(hits) == top`; paginate or increase `$top` (max 20 000) |
| Building `vstfs:///` URIs without project/repo GUIDs | Artifact links silently fail or link to the wrong target | Fetch `projectId` and `repoId` from the Repos API first |
| Creating a Bug per flaky-test recurrence | Pollutes the backlog | Always call `create_or_comment` to comment on the existing open bug |
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
- Link work items to objects (add-link guide):
  [learn.microsoft.com/en-us/azure/devops/boards/backlogs/add-link](https://learn.microsoft.com/en-us/azure/devops/boards/backlogs/add-link?view=azure-devops).
- Link type reference (relation type names):
  [learn.microsoft.com/en-us/azure/devops/boards/queries/link-type-reference](https://learn.microsoft.com/en-us/azure/devops/boards/queries/link-type-reference).
- Agile process workflow (Bug state model):
  [learn.microsoft.com/en-us/azure/devops/boards/work-items/guidance/agile-process-workflow](https://learn.microsoft.com/en-us/azure/devops/boards/work-items/guidance/agile-process-workflow).
- Sibling references:
  [`bug-lifecycle-reference`](../bug-lifecycle-reference/SKILL.md),
  [`severity-vs-priority-reference`](../severity-vs-priority-reference/SKILL.md).
- Sibling skills:
  [`jira-bug-workflow-runner`](../jira-bug-workflow-runner/SKILL.md),
  [`linear-bug-workflow-runner`](../linear-bug-workflow-runner/SKILL.md),
  [`github-issues-bug-workflow`](../github-issues-bug-workflow/SKILL.md).
- Consumed by:
  [`bug-report-from-failure`](../bug-report-from-failure/SKILL.md).
