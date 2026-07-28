# TestRail API v2 reference

Custom-field discovery, type / priority enums, and the section + suite hierarchy
for the TestRail API v2. Per the TestRail API docs (support.testrail.com;
Cloudflare-protected, cite by stable URL).

## Discover custom fields

Each tenant defines its own custom fields. Discover IDs once:

    fields = api("get_case_fields")
    for f in fields:
        print(f["system_name"], f["label"], f["type_id"])
    # custom_preconds Preconditions 3
    # custom_severity Severity 6
    # custom_automation_type Automation Type 6

`type_id` values per TestRail docs: 1=String, 2=Integer, 3=Text, 4=URL,
5=Checkbox, 6=Dropdown, 7=User, 8=Date, 9=Milestone, 10=Steps, 11=Multi-select.

## Discover types + priorities

    types = api("get_case_types")   # -> [{"id", "name", "is_default"}, ...]
    prios = api("get_priorities")   # -> [{"id", "name", "priority", ...}, ...]

Build name-to-id maps from these; never hard-code the integers (they differ per
project).

## Sections + suites

    api("add_suite/123", method="POST", body={"name": "Authentication"})
    api("add_section/123", method="POST",
        body={"suite_id": 7, "name": "Login flows", "parent_id": None})

Hierarchy: project -> suite -> section (nests via `parent_id`) -> case. Keep
section trees at 3 levels or fewer; the UI display is shallow.
