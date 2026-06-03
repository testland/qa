---
name: jira-bug-workflow-runner
description: "Author and run Jira Cloud bug workflows via REST API v3 - issue creation, state transitions, JQL search for triage queues, severity/priority field updates. Covers issue creation with ADF description, transition lookup + apply, JQL search for duplicate detection, label-based classification (severity/priority/regression), and CI-driven bug filing from test failures. Use when programmatically managing Jira bug lifecycle states (creates, triages, transitions, closes) - distinct from qa-test-reporting/jira-issue-importer which posts test-result-link issues."
rating: 24
d6: 4
---

# jira-bug-workflow-runner

## Overview

Jira's workflow engine maps cleanly to the canonical defect lifecycle
([`bug-lifecycle-reference`](../bug-lifecycle-reference/SKILL.md))
but every project's actual workflow is configurable, so the
runner has to look up transition IDs at runtime rather than
hard-code them.

This skill wraps the Jira Cloud REST API v3 (per
[developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/))
for the four core operations: create, transition, update, and
search.

## When to use

- Filing a bug from a CI test failure (consumed by
  [`bug-report-from-failure`](../bug-report-from-failure/SKILL.md)).
- Bulk-transitioning bugs after a release (e.g., move all
  `Verified` → `Closed` after deployment).
- Building a triage script that pulls New defects and applies
  severity / priority based on labels.
- Backing the
  [`duplicate-defect-finder`](../../agents/duplicate-defect-finder.md)
  agent's search backend.

## Authoring

### Authentication

Per Atlassian docs, Jira Cloud REST API v3 uses HTTP Basic auth
with an API token:

```bash
export JIRA_BASE="https://your-tenant.atlassian.net"
export JIRA_EMAIL="you@company.com"
export JIRA_TOKEN="<api-token-from-id.atlassian.com>"
export JIRA_AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_TOKEN" | base64)
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

`POST /rest/api/3/issue` per the API group docs. The `description`
must be Atlassian Document Format (ADF), not plain text.

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

Note: `severity` is typically a custom field - most tenants
either define a custom Severity field (`customfield_XXXXX`) or
use labels (`severity-critical`). The example above uses labels
for portability; see "Severity custom field" below.

### Severity custom field

Discover the custom-field ID once per tenant:

```bash
curl -u "$JIRA_EMAIL:$JIRA_TOKEN" \
     "$JIRA_BASE/rest/api/3/field" \
     | jq '.[] | select(.name=="Severity") | {id, name}'
# {"id": "customfield_10039", "name": "Severity"}
```

Then submit it in the create payload:

```python
"customfield_10039": {"value": severity},  # "Critical" | "High" | ...
```

### Look up and apply a transition

Workflow transitions are project-specific. Look up the available
transitions then apply by transition ID:

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

### Update fields

`PUT /rest/api/3/issue/{key}` for arbitrary field updates:

```python
def update_priority(issue_key, priority_name):
    r = requests.put(
        f"{BASE}/rest/api/3/issue/{issue_key}",
        json={"fields": {"priority": {"name": priority_name}}},
        headers=HEADERS,
    )
    r.raise_for_status()
```

### Search via JQL

`POST /rest/api/3/search/jql` returns issues matching a JQL query.
Useful for duplicate detection and triage queues.

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

## Running

### Idempotent bug creation

CI bug filing must not duplicate if the same failure recurs. Pair
with `duplicate-defect-finder` upstream, but also defensively
search before creating:

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

### Bulk transition after release

```python
verified = search_jql(
    'project = ENG AND status = Verified AND fixVersion = "2026.05.20"',
    max_results=1000,
)
for issue in verified:
    transition(issue["key"], "Close Issue")
```

## Parsing results

`create_bug` returns the new issue key (e.g., `ENG-12345`). Use it
to construct a permalink for downstream consumers:

```python
url = f"{BASE}/browse/{issue_key}"
```

Search responses include `expand`, `total`, `startAt`, and
`issues` (the array). Always check `total` against `maxResults`
for pagination.

## CI integration

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

Where `file-jira-bug.py` parses the JUnit XML, extracts the
failure, deduplicates, and creates / comments per the helpers
above.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Hard-coding transition IDs | Workflow updates break the runner silently | Look up transitions per call via `GET /transitions` |
| Plain-text `description` | API returns 400 - Jira v3 requires ADF | Wrap as `{"type": "doc", "version": 1, "content": [...]}` |
| No deduplication before create | Each retry of a flaky test creates a new bug | Search by summary first; comment on existing |
| Severity as built-in `priority` | Conflates two axes ([`severity-vs-priority-reference`](../severity-vs-priority-reference/SKILL.md)) | Use custom Severity field or `severity-*` labels |
| Storing the API token in code | Token leak | Use environment variables / secret stores |
| Polling `/transitions` on every call | Rate-limited | Cache per workflow scheme, refresh on 4xx |
| Bulk transitions without dry-run | Cannot easily reverse if wrong state | Always run in dry-run mode first; log all changes |

## Limitations

- **Workflow is per-project.** A transition name in one project
  may not exist in another - the runner must handle "transition
  not found" gracefully.
- **Custom fields are tenant-specific.** Field IDs (`customfield_10039`)
  vary; discover at deploy time.
- **ADF complexity.** Rich descriptions (code blocks, tables) need
  full ADF construction - see Atlassian's ADF reference.
- **Rate limits.** Jira Cloud rate limits per minute; bulk
  operations need throttling.
- **JQL injection.** `text ~ "user input"` accepts JQL operators - always escape quotes and reserved characters.

## References

- Jira Cloud REST API v3 issues - 
  [developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/).
- Jira Cloud authentication - 
  developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis.
- ADF spec - developer.atlassian.com/cloud/jira/platform/apis/document/structure.
- JQL syntax - confluence.atlassian.com/jiracoreserver/advanced-searching.
- Sibling references:
  [`bug-lifecycle-reference`](../bug-lifecycle-reference/SKILL.md),
  [`severity-vs-priority-reference`](../severity-vs-priority-reference/SKILL.md).
- Sibling skills:
  [`linear-bug-workflow-runner`](../linear-bug-workflow-runner/SKILL.md),
  [`github-issues-bug-workflow`](../github-issues-bug-workflow/SKILL.md).
- Consumed by:
  [`bug-report-from-failure`](../bug-report-from-failure/SKILL.md),
  [`duplicate-defect-finder`](../../agents/duplicate-defect-finder.md).
- Sibling-plugin neighbour:
  [`testrail-integration`](../../../qa-test-reporting/skills/testrail-integration/SKILL.md) - different scope (test-result posting; not bug workflow).
