---
name: tcm-case-management
description: "Test case management (TCM) across the five major platforms - TestRail, Xray, Zephyr Scale, Allure TestOps, and Qase - one tool-agnostic workflow for pre-execution case authoring and repository management: create and update cases, organise suites / sections / folders, attach structured steps with per-step expected results, link cases to requirements (Jira / Linear / GitHub), bulk import from CSV / JSON with idempotent re-runs, and sync from CI. The body works the workflow end to end against TestRail's API v2; references/ carries the per-vendor API specifics (auth model, endpoints, steps shape, enums, rate limits) for all five tools. Use for test case management in any of the five TCMs - authoring cases from a spec, bulk-importing legacy cases, migrating between tools, or mass-editing a case repository. Do NOT use for posting test-run results (pass/fail): result sync is the qa-test-reporting plugin's *-integration surface."
---

# tcm-case-management

## Overview

Every mainstream TCM stores the same canonical case anatomy
(`test-case-anatomy-reference`: identifier, objective, preconditions, steps,
expected results, traceability) under different field names, containers, and
auth models. The workflow is identical across tools:

1. Authenticate with the platform's token scheme.
2. Create the container hierarchy (suite / section / folder).
3. Create cases with structured steps (one action + one expected result per step).
4. Discover tenant-specific enums (types, priorities, custom fields) at runtime.
5. Link cases to requirements for traceability.
6. List with pagination; bulk-import with idempotency and verification.
7. Sync from CI.

This skill works that workflow end to end using **TestRail** (the largest
install base) as the primary example, then routes the per-vendor API deltas
to references/.

**Differentiation vs result sync:** this skill operates on the *case
repository* - create, update, organise, traceability - a strictly
pre-execution concern. Posting test-run results (pass/fail, status updates)
is the qa-test-reporting plugin's `testrail-integration` / `xray-integration`
/ `zephyr-integration` surface.

## When to use

- Creating cases from a spec / requirement / acceptance criterion.
- Bulk-importing legacy cases from CSV / Excel.
- Migrating between TCM instances or tools (see also `tcm-migration-agent`).
- Programmatic case updates (mass-edit type, priority, tags).
- Case-repository quality scans (pair with `test-case-quality-critic`).

## Vendor routing table

| Vendor | Reference | Auth | Case container | Steps shape | Distinctive feature |
|---|---|---|---|---|---|
| **TestRail** | [references/testrail.md](references/testrail.md) | HTTP Basic (email + API key) | project → suite → section | `custom_steps_separated` array (Steps template) | Template system (Steps / Text / Exploratory); `refs` free-text requirement links |
| **Xray** (Jira) | [references/xray.md](references/xray.md) | OAuth client credentials → JWT (separate from Jira auth) | Jira issue with `issuetype: Test` | GraphQL `steps` (action / data / result) | Manual / Cucumber / Generic test types; `.feature` import; preconditions as linked issues |
| **Zephyr Scale** (Jira) | [references/zephyr-scale.md](references/zephyr-scale.md) | Bearer token (per-user) | project → folder | separate `/teststeps` endpoint, `OVERWRITE` / `APPEND` modes | Folder hierarchy per entity type; Jira-native links |
| **Allure TestOps** | [references/allure-testops.md](references/allure-testops.md) | Bearer token | project → suite + layer + feature | nested `scenario.steps` (sub-steps) | Links automated allure-results back to manual cases (`@allure.testcase`) |
| **Qase** | [references/qase-io.md](references/qase-io.md) | `Token` header (not `Authorization`) | project → suite | flat `steps` array (action / expected_result / data) | Shared steps reused across cases; inverted priority enum (1=High) |

Each reference carries the vendor's auth setup, create / update / list code,
bulk-import loop, migration field map, response shapes, rate limits, and
anti-patterns.

## The workflow, worked with TestRail

TestRail organises tests as `cases` inside `sections` inside `suites` inside
`projects`. The API v2 covers full CRUD on each plus templates, custom
fields, references, and types. Authentication is HTTP Basic with email + API
key per the TestRail support docs
(support.testrail.com/hc/en-us/articles/7077871398036-Cases -
Cloudflare-protected, cite by stable URL).

### Step 1 - Authenticate

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

### Step 2 - Create a case with structured steps

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

One action per step, each paired with its expected result - the per-step
result tracking is why steps go in the structured field, never a text blob.

### Step 3 - Discover tenant enums at runtime

Each tenant defines its own custom fields, case types, and priorities;
discover their IDs at runtime rather than hard-coding them:

```python
fields = api("get_case_fields")   # system_name, label, type_id per field
types = api("get_case_types")     # id + name per case type
prios = api("get_priorities")     # id + name per priority
type_ids = {t["name"]: t["id"] for t in types}
prio_ids = {p["name"]: p["id"] for p in prios}
```

This discovery step exists in every vendor: Zephyr's `statusName` /
`priorityName` enums are project-scoped, Allure TestOps layers / features are
per-project, Qase types are configurable. Never hard-code the integers.

### Step 4 - Update, get, and list with pagination

```python
def update_case(case_id, **fields):
    return api(f"update_case/{case_id}", method="POST", body=fields)

update_case(1234, refs="REQ-AUTH-001,REQ-AUTH-002")  # bulk re-tag

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
older return a bare array. Handle both. Every vendor paginates differently
(Zephyr `isLast`, Allure `last`, Qase `entities < limit`) - see the
references.

### Step 5 - Bulk import from CSV, idempotently

Build name-to-id maps once, then inside the loop check for an existing case
by title before create so re-runs stay idempotent. `get_cases` accepts
`filter` (substring match on title):

```python
import csv

created, skipped = [], []
for row in csv.DictReader(open("legacy-cases.csv")):
    title = row["title"]
    existing = api(f"get_cases/{project_id}&suite_id={suite_id}"
                   f"&filter={requests.utils.quote(title[:60])}")
    if existing.get("cases"):
        skipped.append((title, existing["cases"][0]["id"]))
        continue  # already present; skip and log
    steps = [
        {"content": s, "expected": e}
        for s, e in zip(row["steps"].split("|"), row["expected"].split("|"))
    ]
    case = create_case(
        section_id=int(row["section_id"]),
        title=title,
        template_id=1,
        type_id=type_ids[row["type"]],
        priority_id=prio_ids[row["priority"]],
        preconditions=row.get("preconditions"),
        steps=steps,
        refs=row.get("refs"),
    )
    created.append(case["id"])
```

**Verify:** assert `len(created) + len(skipped)` equals the row count before
declaring the import done; a shortfall means a row raised - inspect it, fix
the source row, and re-run (already-created cases are skipped by the title
check). On rate-limited vendors (Xray, Zephyr, Qase throttle around 60
req/min) add a `time.sleep(1)` per row and back off further on 429.

### Step 6 - CI sync

Sync cases from a `tests/` directory layout. One pattern: each spec file has
front-matter declaring the case ID; on PR merge, post updates back:

```yaml
- name: Sync test cases to TestRail
  env:
    TR_BASE: ${{ vars.TR_BASE }}
    TR_EMAIL: ${{ vars.TR_EMAIL }}
    TR_KEY: ${{ secrets.TR_KEY }}
  run: python scripts/sync-testrail.py
```

Have the sync script exit non-zero when any case fails to sync, and verify
the repository case count matches the source count after the run - a
mismatch means a silent partial sync.

## Parsing results

Create responses return the full case object (`id`, `created_on`,
`updated_on`, ...). Permalink:

```python
url = f"{BASE}/index.php?/cases/view/{case_id}"
```

Per-vendor response shapes and permalink formats are in each reference.

## Anti-patterns (cross-vendor)

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Hard-coded type / priority / status IDs | Enums differ per project and tenant | Discover at runtime (Step 3) |
| Steps as a single text blob | Per-step results unavailable | Use the structured steps field (Step 2) |
| Plain title with no requirement refs | Coverage reports show 0% requirement coverage | Always link cases to requirement IDs |
| Creating cases in the root container | Hard to find later; organisation chaos | Always pick a section / folder / suite; create as needed |
| No pagination on list endpoints | Misses cases beyond the first page | Loop per the vendor's pagination contract (Step 4) |
| Storing API keys in code | Token leak | Environment variable / CI secret store |
| Bulk-create without throttling or idempotency | 429s; duplicate cases on re-run | Rate-limit + title-check pattern (Step 5) |
| Vendor-specific case structure as the authoring source | Migration cost exploded | Author in the canonical anatomy (`test-case-anatomy-reference`); let the tracker mapping be additive |

## Limitations

- **Vendor docs behind Cloudflare.** All five vendors' API docs require
  browser validation; this skill cites by stable URL. Authenticated API
  calls work fine (different surface).
- **Custom-field discipline varies.** Tenants define different custom
  fields; scripts must discover field IDs at runtime.
- **Requirement refs are only as valid as the reconciliation.** Most TCMs
  don't validate that referenced IDs exist in the tracker; pair with
  `traceability-matrix-builder`.
- **Bulk operations are mostly sequential.** Only Xray has a true bulk
  endpoint; elsewhere loop + throttle.
- **Cloud APIs only.** The references cover each vendor's cloud API; Server
  / Data Center variants (Xray DC, Zephyr DC) have divergent REST shapes.

## References

- TestRail API v2 Cases reference -
  support.testrail.com/hc/en-us/articles/7077871398036-Cases
  (Cloudflare-protected; cite by stable URL).
- Per-vendor API references:
  [references/testrail.md](references/testrail.md),
  [references/xray.md](references/xray.md),
  [references/zephyr-scale.md](references/zephyr-scale.md),
  [references/allure-testops.md](references/allure-testops.md),
  [references/qase-io.md](references/qase-io.md).
- Sibling references:
  `test-case-anatomy-reference` - the canonical case anatomy + tracker schema map.
- Sibling-plugin neighbours:
  `testrail-integration`, `xray-integration`, `zephyr-integration`
  (qa-test-reporting plugin) - post-execution result sync, not case authoring.
