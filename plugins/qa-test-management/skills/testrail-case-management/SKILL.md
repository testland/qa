---
name: testrail-case-management
description: "Author and manage test cases in TestRail via REST API v2 - create cases, organise into suites + sections, update steps + expected results, bulk import from CSV/JSON, set automation status, link to references (Jira / requirements). Covers the Steps / Text / Exploratory templates, custom-field discovery (`get_case_fields`), and pagination on `get_cases`. Use for pre-execution case authoring and repository management. Do NOT use for submitting test-run results (pass/fail, status updates): posting results via add_results_for_cases is a separate post-execution concern."
---

# testrail-case-management

## Overview

TestRail organises tests as `cases` inside `sections` inside
`suites` inside `projects`. The API v2 covers full CRUD on each
plus templates, custom fields, references, and types. Authentication
is HTTP Basic with email + API key per the TestRail support docs
(support.testrail.com/hc/en-us/articles/7077871398036-Cases - 
Cloudflare-protected, cite by stable URL).

For the canonical anatomy this skill operates on, see
[`test-case-anatomy-reference`](../test-case-anatomy-reference/SKILL.md).

**Differentiation vs `testrail-integration`:** that skill posts
*test-run results* via `add_results_for_cases`. This one operates
on the *case repository* - create, update, organise, traceability - a strictly upstream concern.

## When to use

- Creating cases from a spec / requirement / acceptance criterion.
- Bulk-importing legacy cases from CSV / Excel.
- Migrating between TestRail instances or to/from another TCM.
- Programmatic case updates (mass-edit type, priority, tags).
- Case-repository quality scans.

## Authoring

### Authentication

Per TestRail API docs (Cloudflare-protected, support.testrail.com):

```bash
export TR_BASE="https://your-tenant.testrail.io"
export TR_EMAIL="you@company.com"
export TR_KEY="<api-key-from-user-profile>"
```

```python
import requests, base64, os, json

auth = base64.b64encode(
    f"{os.environ['TR_EMAIL']}:{os.environ['TR_KEY']}".encode()
).decode()
HEADERS = {
    "Authorization": f"Basic {auth}",
    "Content-Type": "application/json",
}
BASE = os.environ["TR_BASE"]

def api(path, method="GET", body=None):
    url = f"{BASE}/index.php?/api/v2/{path.lstrip('/')}"
    r = requests.request(method, url, headers=HEADERS,
                         data=json.dumps(body) if body else None)
    r.raise_for_status()
    return r.json()
```

### Create a case

`POST /index.php?/api/v2/add_case/:section_id`:

```python
def create_case(section_id, title, template_id=1, type_id=1, priority_id=2,
                preconditions=None, steps=None, refs=None):
    """
    template_id: 1=Steps, 2=Text, 3=Exploratory
    type_id: per project - discover via get_case_types
    priority_id: 1=Low, 2=Medium, 3=High, 4=Critical (default project enum)
    steps: list of {"content": "Action", "expected": "Outcome"}
    refs: comma-separated requirement IDs (e.g., "REQ-123,REQ-124")
    """
    body = {
        "title": title,
        "template_id": template_id,
        "type_id": type_id,
        "priority_id": priority_id,
    }
    if preconditions:
        body["custom_preconds"] = preconditions
    if steps and template_id == 1:
        body["custom_steps_separated"] = steps
    if refs:
        body["refs"] = refs
    return api(f"add_case/{section_id}", method="POST", body=body)
```

### Steps template (template_id=1) example

```python
steps = [
    {"content": "Navigate to /login", "expected": "Login form rendered"},
    {"content": "Enter alice@example.com + correct password",
     "expected": "Submit button enabled"},
    {"content": "Click Submit",
     "expected": "Redirected to /dashboard within 2 s"},
]
new_case = create_case(
    section_id=42,
    title="Login with valid credentials redirects to dashboard",
    template_id=1,
    steps=steps,
    preconditions="User `alice@example.com` exists; password set to 'pw123'.",
    refs="REQ-AUTH-001",
)
print(new_case["id"])  # e.g., 1234
```

### Discover custom fields

Each tenant defines its own custom fields. Discover IDs once:

```python
fields = api("get_case_fields")
for f in fields:
    print(f["system_name"], f["label"], f["type_id"])
# custom_preconds Preconditions 3
# custom_severity Severity 6
# custom_automation_type Automation Type 6
# ...
```

`type_id` values per TestRail docs: 1=String, 2=Integer, 3=Text,
4=URL, 5=Checkbox, 6=Dropdown, 7=User, 8=Date, 9=Milestone,
10=Steps, 11=Multi-select.

### Discover types + priorities

```python
types = api("get_case_types")
prios = api("get_priorities")
```

Map names to IDs in your scripts.

### Update a case

`POST /index.php?/api/v2/update_case/:case_id`:

```python
def update_case(case_id, **fields):
    return api(f"update_case/{case_id}", method="POST", body=fields)

# Bulk re-tag:
update_case(1234, refs="REQ-AUTH-001,REQ-AUTH-002")
```

### Get + list cases

```python
case = api(f"get_case/1234")
# List with pagination:
cases = []
offset = 0
while True:
    page = api(f"get_cases/{project_id}&suite_id={suite_id}"
               f"&limit=250&offset={offset}")
    cases.extend(page.get("cases", page) if isinstance(page, dict) else page)
    if isinstance(page, dict) and page.get("size", 0) < 250:
        break
    offset += 250
```

Newer TestRail versions return `{"offset", "limit", "size", "_links", "cases": [...]}`;
older return a bare array. Handle both.

### Sections + suites

```python
api("add_suite/123", method="POST", body={"name": "Authentication"})
api("add_section/123", method="POST",
    body={"suite_id": 7, "name": "Login flows", "parent_id": None})
```

Hierarchies: project → suite → section (can nest via parent_id) →
case.

## Running

### Bulk import from CSV

```python
import csv

with open("legacy-cases.csv") as f:
    for row in csv.DictReader(f):
        steps = [
            {"content": s, "expected": e}
            for s, e in zip(row["steps"].split("|"),
                           row["expected"].split("|"))
        ]
        create_case(
            section_id=int(row["section_id"]),
            title=row["title"],
            template_id=1,
            type_id=type_id_for_name(row["type"]),
            priority_id=priority_id_for_name(row["priority"]),
            preconditions=row.get("preconditions"),
            steps=steps,
            refs=row.get("refs"),
        )
```

### Detecting duplicates before create

`get_cases` accepts `filter` (substring match on title). Always
search before create for idempotence:

```python
existing = api(f"get_cases/{project_id}&suite_id={suite_id}"
               f"&filter={requests.utils.quote(title[:60])}")
if existing.get("cases"):
    print(f"Existing case: {existing['cases'][0]['id']}")
```

## Parsing results

`add_case` response is the full case object with `id`, `created_on`,
`updated_on`, `created_by` etc. Permalink:

```python
url = f"{BASE}/index.php?/cases/view/{case_id}"
```

## CI integration

Sync cases from a `tests/` directory layout. One pattern: each
spec file has front-matter declaring the TestRail case ID; on PR
merge, post updates back:

```yaml
- name: Sync test cases to TestRail
  env:
    TR_BASE: ${{ vars.TR_BASE }}
    TR_EMAIL: ${{ vars.TR_EMAIL }}
    TR_KEY: ${{ secrets.TR_KEY }}
  run: python scripts/sync-testrail.py
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Hard-coded `type_id`, `priority_id` | IDs differ per project | Discover via `get_case_types` / `get_priorities` |
| Steps in `custom_steps` (Text template) | Per-step results unavailable | Use `custom_steps_separated` (Steps template) |
| Plain title with no `refs` | Coverage reports show 0% requirement coverage | Always set `refs` to requirement IDs |
| Creating cases in the root section | Hard to find later; organisation chaos | Always pick a section; create sections as needed |
| No pagination on `get_cases` | Misses cases beyond first 250 | Loop with offset until empty |
| Storing API key in code | Token leak | Environment variable |
| Polling for case existence on every CI run | Rate-limited | Cache case-ID-by-title within the CI run |

## Limitations

- **Cloudflare protection.** TestRail support docs require browser
  validation; this skill cites by stable URL but Headless WebFetch
  fails. Authenticated API calls work fine (different surface).
- **Custom-field discipline varies.** Tenants define different
  custom fields; scripts must discover field IDs at runtime.
- **`refs` is free text.** TestRail doesn't validate that referenced
  IDs exist in Jira / Linear / etc. Pair with traceability matrix
  reconciliation.
- **Hierarchical sections are recursive but display is shallow.**
  Deep section trees are hard to navigate in the UI; keep ≤3
  levels.
- **Bulk operations are sequential.** No native bulk endpoint;
  loop + throttle for large imports.

## References

- TestRail API v2 Cases reference - 
  support.testrail.com/hc/en-us/articles/7077871398036-Cases
  (Cloudflare-protected; cite by stable URL).
- TestRail API v2 Suites + Sections + Custom Fields docs - 
  support.testrail.com/hc/en-us/categories/7076541806228.
- Sibling references:
  [`test-case-anatomy-reference`](../test-case-anatomy-reference/SKILL.md).
- Sibling skills (other platforms):
  [`xray-case-management`](../xray-case-management/SKILL.md),
  [`zephyr-scale-case-management`](../zephyr-scale-case-management/SKILL.md),
  [`allure-testops-case-management`](../allure-testops-case-management/SKILL.md),
  [`qase-io-case-management`](../qase-io-case-management/SKILL.md).
- Sibling-plugin neighbour:
  `testrail-integration` (in the qa-test-reporting plugin) - different scope (result sync; not case authoring).
