# TestRail - API specifics

Per-vendor reference for the `tcm-case-management` SKILL.md. The spine works the full workflow (auth, create, discover, list, bulk import, CI sync) against TestRail; this file carries the remaining TestRail API v2 specifics. Per the TestRail API docs (support.testrail.com/hc/en-us/articles/7077871398036-Cases; Cloudflare-protected, cite by stable URL).

## Hierarchy

Project -> suite -> section (nests via `parent_id`) -> case. Keep section
trees at 3 levels or fewer; the UI display is shallow.

```python
api("add_suite/123", method="POST", body={"name": "Authentication"})
api("add_section/123", method="POST",
    body={"suite_id": 7, "name": "Login flows", "parent_id": None})
```

## Templates

`template_id`: 1=Steps, 2=Text, 3=Exploratory. Use the Steps template
(`custom_steps_separated`) for hand-executed cases - per-step results are
unavailable on the Text template (`custom_steps`).

## Custom-field discovery

Each tenant defines its own custom fields. Discover IDs once:

```python
fields = api("get_case_fields")
for f in fields:
    print(f["system_name"], f["label"], f["type_id"])
# custom_preconds Preconditions 3
# custom_severity Severity 6
# custom_automation_type Automation Type 6
```

`type_id` values per TestRail docs: 1=String, 2=Integer, 3=Text, 4=URL,
5=Checkbox, 6=Dropdown, 7=User, 8=Date, 9=Milestone, 10=Steps, 11=Multi-select.

## Types + priorities

```python
types = api("get_case_types")   # -> [{"id", "name", "is_default"}, ...]
prios = api("get_priorities")   # -> [{"id", "name", "priority", ...}, ...]
```

Build name-to-id maps from these; never hard-code the integers (they differ
per project). Default priority enum: 1=Low, 2=Medium, 3=High, 4=Critical.

## Traceability

`refs` is a comma-separated free-text field of requirement IDs
(e.g., `"REQ-123,REQ-124"`). TestRail doesn't validate that referenced IDs
exist in Jira / Linear / etc.; pair with traceability-matrix reconciliation.

## Response shapes + permalink

- `add_case` returns the full case object: `id`, `created_on`, `updated_on`,
  `created_by`, all custom fields.
- `get_cases` (newer versions) returns
  `{"offset", "limit", "size", "_links", "cases": [...]}`; older versions
  return a bare array - handle both.
- Permalink: `{BASE}/index.php?/cases/view/{case_id}`.

## TestRail-specific anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Steps in `custom_steps` (Text template) | Per-step results unavailable | Use `custom_steps_separated` (Steps template) |
| Polling for case existence on every CI run | Rate-limited | Cache case-ID-by-title within the CI run |

## Limitations

- **Cloudflare protection.** TestRail support docs require browser
  validation; cite by stable URL. Authenticated API calls work fine.
- **`refs` is free text.** No cross-tracker validation.
- **Hierarchical sections are recursive but display is shallow.** Keep <=3
  levels.
- **Bulk operations are sequential.** No native bulk endpoint; loop +
  throttle for large imports.

## References

- TestRail API v2 Cases reference -
  support.testrail.com/hc/en-us/articles/7077871398036-Cases.
- TestRail API v2 Suites + Sections + Custom Fields docs -
  support.testrail.com/hc/en-us/categories/7076541806228.
- Sibling-plugin neighbour: `test-management-sync` (qa-test-reporting) -
  result sync via `add_results_for_cases`, not case authoring.
