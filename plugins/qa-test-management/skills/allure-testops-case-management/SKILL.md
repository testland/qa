---
name: allure-testops-case-management
description: "Author and manage Allure TestOps test cases via the REST API - create cases, manage projects + suites, attach scenarios with nested steps, link to Jira / GitHub issues, sync with allure-results from CI runs. Covers Bearer-token auth, /api/rs/testcase CRUD endpoints, nested-step `scenario` shape, and the unique Allure TestOps feature of linking automated results back to manual case definitions. Use for pre-execution case authoring in teams using Allure TestOps as the canonical TCM."
rating: 22
d6: 4
---

# allure-testops-case-management

## Overview

Allure TestOps (formerly Allure Server, by Qameta Software)
combines test case management with the Allure reporting framework
that automated tests already emit. The unique feature: automated
tests' allure-results JSON link back to manual case definitions
in the TCM, providing automation-coverage visibility at the case
level.

Per docs.qameta.io/allure-testops (Cloudflare-protected; cite by
stable URL).

For canonical anatomy, see
[`test-case-anatomy-reference`](../test-case-anatomy-reference/SKILL.md).

## When to use

- Authoring cases in teams already using Allure framework for
  automated reporting.
- Linking automated test results to manual case definitions.
- Migrating from a legacy TCM to Allure TestOps.
- Backing the
  [`test-case-quality-critic`](../../agents/test-case-quality-critic.md)
  scans for Allure TestOps-using teams.

## Authoring

### Authentication

Allure TestOps uses Bearer tokens (API tokens generated per user):

```bash
export ATO_BASE="https://your-tenant.qatools.cloud"   # or self-hosted URL
export ATO_TOKEN="<api-token>"
```

```python
import requests, os

BASE = os.environ["ATO_BASE"]
HEADERS = {
    "Authorization": f"Bearer {os.environ['ATO_TOKEN']}",
    "Content-Type": "application/json",
}
```

### Create a test case

`POST /api/rs/testcase`:

```python
def create_case(project_id, name, description=None, precondition=None,
                scenario_steps=None, status="Active", layer_id=None,
                feature_id=None):
    """
    scenario_steps: list of {"keyword": "Given|When|Then|And",
                              "name": "...", "expectedResult": "..."}
    status: Active / Outdated / Archived
    layer_id: testing layer (UI / API / Component / Unit) — discover via
              /api/rs/testlayer
    """
    body = {
        "projectId": project_id,
        "name": name,
        "description": description,
        "precondition": precondition,
        "status": status,
        "layerId": layer_id,
        "featureId": feature_id,
    }
    r = requests.post(f"{BASE}/api/rs/testcase", json=body, headers=HEADERS)
    r.raise_for_status()
    created = r.json()
    if scenario_steps:
        attach_scenario(created["id"], scenario_steps)
    return created
```

### Scenario + nested steps

Allure TestOps' scenario shape supports nested steps (steps with
sub-steps), uniquely among the five TCMs covered here:

```python
def attach_scenario(case_id, steps):
    """
    steps: nested tree, e.g.,
      [
        {"keyword": "Given", "name": "User is logged in",
         "steps": [
           {"name": "Navigate to /login"},
           {"name": "Enter credentials"},
           {"name": "Submit form"},
         ]},
        {"keyword": "When", "name": "User clicks Checkout"},
        {"keyword": "Then", "name": "Order is placed",
         "expectedResult": "Confirmation page shows order ID"},
      ]
    """
    r = requests.post(
        f"{BASE}/api/rs/testcase/{case_id}/scenario",
        json={"steps": steps},
        headers=HEADERS,
    )
    r.raise_for_status()
```

Nested steps unlock BDD-style hierarchies and step-reuse.

### Layers + features

```python
# Discover layers in a project
layers = requests.get(f"{BASE}/api/rs/testlayer",
                      params={"projectId": project_id},
                      headers=HEADERS).json()
# [{"id": 1, "name": "API"}, {"id": 2, "name": "UI"}, ...]

# Discover features
features = requests.get(f"{BASE}/api/rs/feature",
                        params={"projectId": project_id},
                        headers=HEADERS).json()
```

Layers + features are how Allure TestOps organises cases (in
addition to suites).

### Link to issue tracker (Jira / GitHub / Linear)

Allure TestOps integrates with multiple trackers; configure the
integration in the UI, then link a case to an issue:

```python
def link_to_issue(case_id, integration_id, issue_key):
    r = requests.post(
        f"{BASE}/api/rs/testcase/{case_id}/issue",
        json={"integrationId": integration_id, "key": issue_key},
        headers=HEADERS,
    )
    r.raise_for_status()
```

### Tags + custom fields

```python
def set_tags(case_id, tag_names):
    r = requests.post(
        f"{BASE}/api/rs/testcase/{case_id}/tag",
        json={"tags": [{"name": t} for t in tag_names]},
        headers=HEADERS,
    )
    r.raise_for_status()
```

Tags can be key-value: `tags = ["severity:critical", "team:checkout"]`.

### Get + list

```python
case = requests.get(f"{BASE}/api/rs/testcase/{case_id}",
                    headers=HEADERS).json()

# Paginated list
def list_cases(project_id, page_size=100):
    out = []
    page = 0
    while True:
        r = requests.get(f"{BASE}/api/rs/testcase",
                         params={"projectId": project_id,
                                 "page": page, "size": page_size},
                         headers=HEADERS)
        r.raise_for_status()
        data = r.json()
        out.extend(data.get("content", []))
        if data.get("last", False):
            break
        page += 1
    return out
```

Response shape: `{"content": [...], "page", "totalPages", "totalElements", "last"}`.

## Running

### Sync allure-results into manual cases

The unique Allure TestOps integration - link automated tests'
results to manual case IDs:

```python
# In your automated test (using allure-pytest, allure-junit, etc.):
import allure

@allure.testcase("ATO-1234")  # links to Allure TestOps case ID 1234
def test_checkout_flow():
    ...
```

When the CI run uploads `allure-results` to Allure TestOps,
results auto-attach to the linked case. Coverage report shows
which manual cases have automation backing.

### Migration target field map

| Source field | Allure TestOps field |
|---|---|
| Title | `name` |
| Description / objective | `description` |
| Precondition | `precondition` |
| Steps | `scenario.steps` (with optional nesting) |
| Type | `layerId` (UI / API / Component / Unit) |
| Component | `featureId` |
| Status | `status` (Active / Outdated / Archived) |
| Severity | tags or custom field |
| Priority | tags or custom field |
| Requirement traceability | `/testcase/{id}/issue` |

## Parsing results

`POST /testcase` returns `{"id", "name", "createdDate", "createdBy", ...}`.
Build permalink:

```python
url = f"{BASE}/project/{project_id}/test-cases/{case_id}"
```

## CI integration

Upload allure-results after every CI run; Allure TestOps ingests
and links to manual cases by ID:

```yaml
- name: Run tests with Allure
  run: pytest --alluredir=allure-results

- name: Upload to Allure TestOps
  env:
    ATO_TOKEN: ${{ secrets.ALLURE_TESTOPS_TOKEN }}
    ATO_BASE: ${{ vars.ALLURE_TESTOPS_BASE }}
    ATO_PROJECT_ID: ${{ vars.ATO_PROJECT_ID }}
  run: |
    allurectl upload allure-results \
      --endpoint $ATO_BASE \
      --token $ATO_TOKEN \
      --project-id $ATO_PROJECT_ID \
      --launch-name "CI run ${GITHUB_RUN_NUMBER}"
```

(`allurectl` is the official CLI; pip install `allurectl`.)

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Flat steps for hierarchical workflows | Loses Allure TestOps' nested-step advantage | Use nested `scenario.steps` |
| No layer assignment | Coverage reports lose the UI/API/Unit split | Always set `layerId` |
| Manual cases not linked to automation | Coverage shows 0% even when tests exist | Use `@allure.testcase("ATO-1234")` decorator + sync |
| Tag-based severity / priority without convention | Cross-team queries break | Adopt prefix convention (`severity:` / `priority:`) |
| Single project for everything | Hard to navigate | Project per product / service |
| Skipping `allurectl` for results upload | Manual upload error-prone | Always use `allurectl upload` |

## Limitations

- **Less ubiquitous than TestRail / Xray.** Hiring market for
  Allure TestOps users is smaller; tool-specific expertise may be
  scarce.
- **Tight coupling to Allure framework.** Maximum value comes from
  using allure-pytest / allure-junit / allure-jest in tests; teams
  not using Allure framework miss the automation-linking story.
- **Self-hosted complexity.** Allure TestOps can be self-hosted;
  Cloud version is more common but requires SaaS commitment.
- **Custom field discipline.** Like other TCMs, tenants vary in
  how custom fields are used.

## References

- Allure TestOps docs - 
  docs.qameta.io/allure-testops (Cloudflare-protected; cite by
  stable URL).
- Allure TestOps REST API - 
  docs.qameta.io/allure-testops/integrations/rest-api/.
- allurectl CLI - 
  github.com/allure-framework/allurectl.
- Sibling references:
  [`test-case-anatomy-reference`](../test-case-anatomy-reference/SKILL.md).
- Sibling skills:
  [`testrail-case-management`](../testrail-case-management/SKILL.md),
  [`xray-case-management`](../xray-case-management/SKILL.md),
  [`zephyr-scale-case-management`](../zephyr-scale-case-management/SKILL.md),
  [`qase-io-case-management`](../qase-io-case-management/SKILL.md).
- Sibling-plugin neighbour:
  [`allure-reports`](../../../qa-test-reporting/skills/allure-reports/SKILL.md) - different scope (allure-results parser; not case repository).
