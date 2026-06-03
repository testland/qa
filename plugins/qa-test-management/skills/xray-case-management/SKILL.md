---
name: xray-case-management
description: "Author and manage Xray test cases (Jira issues with Test issue type) via the GraphQL + REST APIs - create tests, attach steps, link preconditions, set testType (Manual / Cucumber / Generic), associate with requirements, bulk import via JSON. Covers OAuth client_id/client_secret auth, the GraphQL createTest mutation, the REST /api/v2/import/test/bulk endpoint, and the Cucumber-style scenario authoring path. Use for pre-execution case authoring in Jira-anchored teams using Xray. Distinct from Xray's test-execution / test-run features which post results."
rating: 23
d6: 4
---

# xray-case-management

## Overview

In Xray, tests are first-class Jira issues with `issuetype: Test`.
Xray augments them with test-specific data (steps, type,
preconditions) accessible via either the REST v2 API or a GraphQL
endpoint.

Per docs.getxray.app/display/XRAYCLOUD/REST+API (Cloudflare-
protected; cite by stable URL).

For canonical anatomy this skill operates on, see
[`test-case-anatomy-reference`](../test-case-anatomy-reference/SKILL.md).

## When to use

- Authoring tests in Jira-anchored teams using Xray.
- Bulk-importing Cucumber `.feature` files as tests.
- Programmatic management of test types (Manual / Cucumber /
  Generic) and preconditions.
- Backing
  [`test-case-quality-critic`](../../agents/test-case-quality-critic.md)
  case-repository scans for Xray-using teams.

## Authoring

### Authentication - OAuth client credentials

Xray Cloud requires OAuth client credentials (different from Jira
auth):

```bash
# From Xray Global Settings → API Keys, create a client
export XRAY_CLIENT_ID="..."
export XRAY_CLIENT_SECRET="..."
export JIRA_BASE="https://your-tenant.atlassian.net"
```

```python
import requests, os

# Exchange client credentials for a JWT
def get_token():
    r = requests.post("https://xray.cloud.getxray.app/api/v2/authenticate",
                      json={"client_id": os.environ["XRAY_CLIENT_ID"],
                            "client_secret": os.environ["XRAY_CLIENT_SECRET"]})
    r.raise_for_status()
    return r.text.strip('"')   # response is a quoted string

XRAY_BASE = "https://xray.cloud.getxray.app/api/v2"
GRAPHQL = "https://xray.cloud.getxray.app/api/v2/graphql"

def xray_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
```

JWT expires in 24 hours; cache + refresh.

### Create a Manual test (GraphQL)

```python
CREATE_TEST_MUTATION = """
mutation CreateTest($input: CreateTestInput!) {
  createTest(input: $input) {
    test { issueId jira(fields: ["key", "summary"]) }
    warnings
  }
}
"""

def create_manual_test(token, project_key, summary, steps,
                       preconditions_issue_id=None):
    """
    steps: list of {"action": "...", "data": "...", "result": "..."}
    """
    variables = {
        "input": {
            "testType": {"name": "Manual"},
            "jira": {
                "fields": {
                    "summary": summary,
                    "project": {"key": project_key},
                    "issuetype": {"name": "Test"},
                }
            },
            "steps": steps,
            "preconditionIssueIds": [preconditions_issue_id] if preconditions_issue_id else [],
        }
    }
    r = requests.post(GRAPHQL,
                      json={"query": CREATE_TEST_MUTATION, "variables": variables},
                      headers=xray_headers(token))
    r.raise_for_status()
    return r.json()
```

### Test types

Per Xray docs, the three canonical types:

| testType | Steps storage | When to use |
|---|---|---|
| `Manual` | Structured step list with action / data / result | Default; hand-executed cases |
| `Cucumber` | Gherkin scenario text | BDD-driven tests (composes with [`qa-bdd`](../../../qa-bdd/)) |
| `Generic` | Single free-text definition | Automated tests where the script is the spec |

### Bulk import (REST)

`POST /api/v2/import/test/bulk` accepts JSON arrays of tests:

```python
def bulk_import(token, project_key, tests):
    """
    tests: list of {"testtype": "Manual", "fields": {...}, "steps": [...]}
    """
    r = requests.post(
        f"{XRAY_BASE}/import/test/bulk",
        json={"projectKey": project_key, "tests": tests},
        headers=xray_headers(token),
    )
    r.raise_for_status()
    return r.json()  # returns job id + status poll URL
```

Bulk import returns a job ID - poll `/api/v2/import/test/bulk/{jobId}/status`
until complete.

### Cucumber feature import

```python
# Upload .feature file via /api/v2/import/feature
with open("checkout.feature", "rb") as f:
    r = requests.post(
        f"{XRAY_BASE}/import/feature",
        files={"file": f},
        params={"projectKey": "ENG"},
        headers={"Authorization": f"Bearer {token}"},
    )
```

One scenario = one Test issue; one feature = one Pre-Condition (if
Background present).

### Link to a requirement

Requirements in Xray are arbitrary Jira issues marked with a
Requirement issue type or in a configured project. Link tests to
requirements via Jira issue links:

```python
def link_test_to_requirement(jira_base, jira_email, jira_token,
                              test_key, req_key, link_type="Tests"):
    r = requests.post(
        f"{jira_base}/rest/api/3/issueLink",
        json={
            "type": {"name": link_type},
            "inwardIssue": {"key": req_key},
            "outwardIssue": {"key": test_key},
        },
        auth=(jira_email, jira_token),
    )
    r.raise_for_status()
```

The `Tests`/`TestedBy` link type is Xray-recommended; configure per
project.

### Preconditions as separate issues

Xray stores preconditions as Jira issues with type `Pre-Condition`.
Reuse a precondition across tests via issue linking:

```python
def create_precondition(project_key, summary, definition):
    # POST a Jira issue with issuetype = "Pre-Condition"
    pass  # via Jira REST API v3
```

Then attach via `preconditionIssueIds: [...]` in the create-test
mutation.

## Running

### Migration from another TCM

Map source TCM concepts → Xray:

| Source field | Xray field |
|---|---|
| Title | Jira `summary` |
| Steps | `steps` array |
| Preconditions text | Linked Pre-Condition issue |
| Type | `testType.name` (Manual / Cucumber / Generic) |
| Refs | Jira issue links to requirement issues |

Bulk import N tests via `/api/v2/import/test/bulk`; expect ~50 ms
per test.

### Updating a test

GraphQL `updateTest` mutation (signature similar to `createTest`).
For step changes:

```python
UPDATE_STEPS_MUTATION = """
mutation UpdateTestSteps($issueId: String!, $steps: [UpdateStepInput!]!) {
  updateTestSteps(issueId: $issueId, steps: $steps) {
    test { issueId }
    warnings
  }
}
"""
```

## Parsing results

`createTest` response includes `test.issueId` (internal Jira ID)
and `test.jira` (the requested Jira fields, e.g., `key`). Build
permalink:

```python
url = f"{os.environ['JIRA_BASE']}/browse/{jira_key}"
```

## CI integration

Sync Cucumber `.feature` files on every PR merge:

```yaml
- name: Sync feature files to Xray
  env:
    XRAY_CLIENT_ID: ${{ secrets.XRAY_CLIENT_ID }}
    XRAY_CLIENT_SECRET: ${{ secrets.XRAY_CLIENT_SECRET }}
  run: |
    TOKEN=$(curl -s -X POST -H "Content-Type: application/json" \
      -d '{"client_id":"'$XRAY_CLIENT_ID'","client_secret":"'$XRAY_CLIENT_SECRET'"}' \
      https://xray.cloud.getxray.app/api/v2/authenticate | tr -d '"')
    for f in features/*.feature; do
      curl -X POST -H "Authorization: Bearer $TOKEN" \
        -F "file=@$f" \
        "https://xray.cloud.getxray.app/api/v2/import/feature?projectKey=ENG"
    done
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Storing preconditions in step 1 of every test | Duplication; preconditions evolve and tests drift | Use Pre-Condition issues + `preconditionIssueIds` |
| Manual tests as Generic (single text blob) | Per-step results lost | Use `testType: Manual` with structured steps |
| Skipping the OAuth client setup | Xray Cloud rejects Jira-auth-only requests | Always use Xray's OAuth credentials |
| Hard-coding the JWT | Expires in 24 h | Cache + refresh on 401 |
| Creating tests via Jira REST without Xray-specific fields | Tests look right in Jira but Xray's data layer (steps, type) is empty | Use GraphQL `createTest` or REST `/import/test/bulk` |
| Polling job status without backoff | Rate-limited | Exponential backoff |
| One feature = many tests imported individually | Slow | Import via `/import/feature` (single call) |

## Limitations

- **Cloud vs Server/DC API divergence.** Cloud uses GraphQL +
  /api/v2 REST; Server / DC has its own Xray REST. This skill
  covers Cloud.
- **Auth doubles up.** Test creation needs Jira auth (for issue
  fields) and Xray auth (for steps + testType). Manage both
  tokens.
- **No native severity field.** Severity comes from a Jira custom
  field; configure per project.
- **Rate limits.** Bulk endpoints throttle around 60 requests /
  minute per tenant; pace accordingly.
- **GraphQL schema versioning.** Mutation signatures evolve;
  check Xray release notes before upgrading scripts.

## References

- Xray Cloud REST API - 
  docs.getxray.app/display/XRAYCLOUD/REST+API (Cloudflare-
  protected; cite by stable URL).
- Xray Cloud GraphQL - 
  docs.getxray.app/display/XRAYCLOUD/GraphQL+API.
- Xray Cloud Authentication - 
  docs.getxray.app/display/XRAYCLOUD/Authentication+-+REST.
- Sibling references:
  [`test-case-anatomy-reference`](../test-case-anatomy-reference/SKILL.md).
- Sibling skills:
  [`testrail-case-management`](../testrail-case-management/SKILL.md),
  [`zephyr-scale-case-management`](../zephyr-scale-case-management/SKILL.md),
  [`allure-testops-case-management`](../allure-testops-case-management/SKILL.md),
  [`qase-io-case-management`](../qase-io-case-management/SKILL.md).
- Sibling-plugin neighbour:
  [`xray-integration`](../../../qa-test-reporting/skills/xray-integration/SKILL.md) - different scope (result sync).
- Composes with [`qa-bdd`](../../../qa-bdd/) when importing
  Cucumber features.
