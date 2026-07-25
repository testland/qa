# Azure DevOps WIT deep reference

Deep reference for `azuredevops-bug-workflow` SKILL.md. Consult when batch-fetching
field values after a WIQL query, packaging idempotent CI filing, attaching PR /
build artifact links, bulk-closing after a release, driving the az boards CLI, or
wiring an Azure Pipeline to file bugs on test failure.

## Fetch field values after a WIQL query

The WIQL response only returns IDs. Batch-fetch fields with a second call to
`GET /_apis/wit/workitems?ids=...`:

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

`get_work_items` returns the full field map per item under `value[].fields`.

## Idempotent bug creation from CI (packaged)

Search before creating to prevent duplicate defects (per the canonical defect
lifecycle guidance in `bug-lifecycle-reference`):

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

The `comments` endpoint is `api-version 7.1-preview.3` and its contract may change.

## Linking to PRs and builds

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

## Bulk close after release

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

## az boards CLI

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
