# Zephyr Scale Cloud API v2 reference

Migration field map, folder + Jira-link operations, and response shapes for the
Zephyr Scale Cloud REST API v2. Per smartbear.com/test-management/zephyr-scale
(Cloudflare-protected; cite by stable URL). `BASE`, `HEADERS`, and
`resolve_jira_issue_id` are defined in SKILL.md.

## Migration target field map

| Source field | Zephyr field |
|---|---|
| Title | `name` |
| Objective | `objective` |
| Preconditions | `precondition` |
| Steps | testScript items |
| Owner | `ownerId` (Jira user ID) |
| Priority | `priorityName` (project enum) |
| Status | `statusName` |
| Labels | `labels[]` |
| Component | `componentId` (Jira component) |
| Requirement traceability | `/links/issues` |

## Folders

    def create_folder(project_key, name, folder_type="TEST_CASE", parent_id=None):
        r = requests.post(f"{BASE}/folders", json={
            "projectKey": project_key, "name": name,
            "folderType": folder_type,  # TEST_CASE / TEST_PLAN / TEST_CYCLE
            "parentId": parent_id,
        }, headers=HEADERS)
        r.raise_for_status()
        return r.json()

Folders nest; create the hierarchy first, then place cases.

## Linking to Jira issues

    def link_to_jira(test_case_key, issue_key):
        r = requests.post(f"{BASE}/testcases/{test_case_key}/links/issues",
                          json={"issueId": resolve_jira_issue_id(issue_key)},
                          headers=HEADERS)
        r.raise_for_status()

Requires the Jira REST API to resolve issue key -> issue ID separately. Trace
back from cases to requirements via the linked-issues endpoint.

## Response shapes

- Create returns `{"id", "key", "self"}`; `key` is the project-prefixed id (`PROJ-T123`).
- List returns `{"values": [...], "startAt", "maxResults", "total", "isLast"}`;
  page until `isLast` is true.
