---
name: qase-io-case-management
description: "Author and manage Qase.io test cases via the Public API v1 - create cases, organise into suites, attach structured steps, link to Jira/Linear/GitHub, manage shared steps, and bulk-import via JSON. Covers Token header auth, /case/{project_code} CRUD endpoints, the steps array with action / expected_result / data shape, and shared-step reuse. Use for pre-execution case authoring in teams using Qase as a modern lightweight TCM."
---

# qase-io-case-management

## Overview

Qase.io is a modern lightweight TCM popular with smaller / agile
teams that find TestRail / Xray heavy. It offers a clean Public
API v1 (Token-based auth, REST + OpenAPI spec) and a simpler data
model than its competitors.

Per developers.qase.io (Cloudflare-protected; cite by stable URL).

For canonical anatomy, see
[`test-case-anatomy-reference`](../test-case-anatomy-reference/SKILL.md).

## When to use

- Authoring cases in teams using Qase.io as TCM.
- Bulk-importing from CSV / legacy TCM into Qase.
- Programmatic case management (mass-edit, tagging, status
  transitions).
- Backing the
  [`test-case-quality-critic`](../../agents/test-case-quality-critic.md)
  scans for Qase-using teams.

## Authoring

### Authentication

Qase Public API v1 uses Token header authentication:

```bash
export QASE_TOKEN="<api-token-from-qase.io-settings>"
```

```python
import requests, os

BASE = "https://api.qase.io/v1"
HEADERS = {
    "Token": os.environ["QASE_TOKEN"],
    "Content-Type": "application/json",
}
```

Note the header is literally `Token` (not `Authorization`), which
is unusual.

### Create a case

`POST /case/{project_code}`:

```python
def create_case(project_code, title, description=None, preconditions=None,
                postconditions=None, steps=None, suite_id=None,
                severity=4, priority=2, type=1, automation=0,
                status=1, params=None):
    """
    severity: 1=Blocker, 2=Critical, 3=Major, 4=Normal, 5=Minor, 6=Trivial
    priority: 1=High, 2=Medium, 3=Low
    type:     1=Functional, 2=Smoke, 3=Regression, 4=Security, etc. (per project enum)
    automation: 0=Manual, 1=Automated, 2=To-be-automated
    status:   0=Actual, 1=Draft, 2=Deprecated
    steps: list of {"action": "...", "expected_result": "...", "data": "..."}
    """
    body = {
        "title": title,
        "description": description,
        "preconditions": preconditions,
        "postconditions": postconditions,
        "severity": severity,
        "priority": priority,
        "type": type,
        "automation": automation,
        "status": status,
        "suite_id": suite_id,
        "steps": steps or [],
        "params": params or {},
    }
    r = requests.post(f"{BASE}/case/{project_code}",
                      json=body, headers=HEADERS)
    r.raise_for_status()
    return r.json()
```

### Severity + priority + type enums

Per developers.qase.io schema definitions:

| Field | Values |
|---|---|
| `severity` | 1=Blocker, 2=Critical, 3=Major, 4=Normal, 5=Minor, 6=Trivial |
| `priority` | 1=High, 2=Medium, 3=Low |
| `type` | 1=Functional, 2=Smoke, 3=Regression, 4=Security, 5=Usability, 6=Performance, 7=Acceptance, 8=Compatibility (defaults; configurable) |
| `automation` | 0=Manual, 1=Automated, 2=To-be-automated |
| `status` | 0=Actual, 1=Draft, 2=Deprecated |

Map per
[`severity-vs-priority-reference`](../../../qa-defect-management/skills/severity-vs-priority-reference/SKILL.md);
note Qase priority is reversed from defect-management convention
(1=High here vs 1=Critical in IEEE 1044).

### Steps

```python
steps = [
    {"action": "Navigate to /login",
     "expected_result": "Login form rendered",
     "data": ""},
    {"action": "Enter alice@example.com + correct password",
     "expected_result": "Submit button enabled",
     "data": "alice@example.com / pw123"},
    {"action": "Click Submit",
     "expected_result": "Redirected to /dashboard within 2 s",
     "data": ""},
]
case = create_case("AUTH", "Login redirects to dashboard",
                   steps=steps, suite_id=42,
                   severity=3, priority=1)
```

### Suites (test suite hierarchy)

```python
def create_suite(project_code, title, description=None, parent_id=None):
    body = {"title": title, "description": description,
            "parent_id": parent_id}
    r = requests.post(f"{BASE}/suite/{project_code}",
                      json=body, headers=HEADERS)
    r.raise_for_status()
    return r.json()
```

Suites nest; create the hierarchy first, then place cases.

### Shared steps

A unique Qase feature: define a step once, reuse across cases.

```python
def create_shared_step(project_code, title, action, expected_result, data=None):
    r = requests.post(
        f"{BASE}/shared_step/{project_code}",
        json={"title": title, "action": action,
              "expected_result": expected_result, "data": data},
        headers=HEADERS,
    )
    r.raise_for_status()
    return r.json()

# Reference shared step in a case
steps = [
    {"shared_step_hash": shared_step_hash},
    {"action": "...", "expected_result": "..."},
]
```

### Update a case

`PATCH /case/{project_code}/{id}`:

```python
def update_case(project_code, case_id, **fields):
    r = requests.patch(f"{BASE}/case/{project_code}/{case_id}",
                       json=fields, headers=HEADERS)
    r.raise_for_status()
    return r.json()
```

### Get + list

```python
case = requests.get(f"{BASE}/case/{project_code}/{case_id}",
                    headers=HEADERS).json()

def list_cases(project_code, limit=100):
    cases = []
    offset = 0
    while True:
        r = requests.get(f"{BASE}/case/{project_code}",
                         params={"limit": limit, "offset": offset},
                         headers=HEADERS)
        r.raise_for_status()
        data = r.json().get("result", {})
        cases.extend(data.get("entities", []))
        if len(data.get("entities", [])) < limit:
            break
        offset += limit
    return cases
```

Response shape: `{"status": true, "result": {"total", "filtered",
"count", "entities": [...]}}`.

## Running

### Bulk import via CSV

```python
import csv

with open("legacy.csv") as f:
    for row in csv.DictReader(f):
        steps = [
            {"action": s, "expected_result": e, "data": d}
            for s, e, d in zip(
                row["steps"].split("|"),
                row["expected"].split("|"),
                (row.get("data") or "").split("|"),
            )
        ]
        create_case(
            project_code=row["project"],
            title=row["title"],
            preconditions=row.get("preconditions"),
            steps=steps,
            severity=int(row.get("severity", 4)),
            priority=int(row.get("priority", 2)),
            suite_id=int(row["suite_id"]),
        )
```

### Link cases to issues

Qase supports linking via the `tags` / `external_issues` field
(per project integration):

```python
update_case(project_code, case_id, tags=["jira:ENG-123"])
```

The platform supports first-class integrations with Jira / GitHub /
Linear; configure in Qase UI.

## Parsing results

`POST /case/{project_code}` returns `{"status": true, "result":
{"id": N}}`. Build permalink:

```python
url = f"https://app.qase.io/project/{project_code}?case={case_id}"
```

## CI integration

```yaml
- name: Sync Qase cases
  env:
    QASE_TOKEN: ${{ secrets.QASE_TOKEN }}
  run: python scripts/sync-qase.py
```

For result reporting after CI runs, use the `qase-pytest` /
`qase-cypress` / `qase-playwright` reporters that post to
`/result/{project_code}` (different surface from this case-
management API).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `Authorization: Bearer <token>` | Qase uses `Token` header, not `Authorization` | Set `Token` header directly |
| Hard-coded severity/priority integers | Easy to mix up the inverted Qase convention | Use named constants per the enum table |
| Inlining shared steps everywhere | Repeated maintenance, drift | Define shared steps; reference via `shared_step_hash` |
| Single suite for everything | Hard to navigate at scale | Suite per feature area |
| Skipping `automation` field | Coverage reports incomplete | Set `automation` field per case |
| Bulk-create without rate throttling | 429s on >100 cases / min | Throttle to ~60 req / min |

## Limitations

- **Smaller market share.** Fewer integrations than TestRail / Xray;
  some tools (specific CI plugins) may not exist.
- **Inverted priority enum.** Qase priority 1=High (vs IEEE
  convention 1=Critical); careful when mapping cross-tool.
- **No layered scenario.** Steps are flat (no nesting like Allure
  TestOps).
- **Custom field discipline.** Tenant-specific; scripts must
  discover field IDs.
- **Public API v1 only.** API v2 announced but not yet stable at
  publication.

## References

- Qase Public API v1 docs - developers.qase.io (Cloudflare-
  protected; cite by stable URL).
- Qase API reference (Swagger / OpenAPI) - developers.qase.io.
- qase-python SDK - github.com/qase-tms/qase-python.
- Sibling references:
  [`test-case-anatomy-reference`](../test-case-anatomy-reference/SKILL.md),
  [`severity-vs-priority-reference`](../../../qa-defect-management/skills/severity-vs-priority-reference/SKILL.md).
- Sibling skills:
  [`testrail-case-management`](../testrail-case-management/SKILL.md),
  [`xray-case-management`](../xray-case-management/SKILL.md),
  [`zephyr-scale-case-management`](../zephyr-scale-case-management/SKILL.md),
  [`allure-testops-case-management`](../allure-testops-case-management/SKILL.md).
