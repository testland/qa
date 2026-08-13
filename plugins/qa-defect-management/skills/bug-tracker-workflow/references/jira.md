# Jira Cloud REST API v3 - field details

Deep Jira specifics for `bug-tracker-workflow`. Auth setup, create,
transition, and JQL search stay in SKILL.md; this file holds the
custom-field, update, and result-parsing detail.

## Severity custom field

`severity` is usually a custom field, not the built-in `priority`. Discover the
field ID once per tenant:

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

## Update fields

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

## Parsing results

`create_bug` returns the new issue key (e.g. `ENG-12345`). Build a permalink:

```python
url = f"{BASE}/browse/{issue_key}"
```

Search responses include `expand`, `total`, `startAt`, and `issues` (the
array). Always check `total` against `maxResults` for pagination.

## Field-spec notes

- **ADF descriptions.** Rich descriptions (code blocks, tables) need full ADF
  construction - see developer.atlassian.com/cloud/jira/platform/apis/document/structure.
- **JQL injection.** `text ~ "user input"` accepts JQL operators - always
  escape quotes and reserved characters before interpolating.
