# GitHub Issues bug workflow

Deep dive for `bug-tracker-workflow`. GitHub Issues has only **two
states**: open and closed. To express the canonical defect lifecycle, teams
supplement Issues with **labels** (severity, priority, status) and
optionally **Projects v2** (status columns). All REST calls per
[docs.github.com/en/rest/issues/issues](https://docs.github.com/en/rest/issues/issues).

## Authentication and API version

```bash
export GITHUB_TOKEN="ghp_..."  # personal access token, classic or fine-grained
export GITHUB_REPO="owner/repo"
```

```python
import requests, os

HEADERS = {
    "Authorization": f"Bearer {os.environ['GITHUB_TOKEN']}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2026-03-10",
}
BASE = f"https://api.github.com/repos/{os.environ['GITHUB_REPO']}"
```

Version-sensitive facts:

- Pin `X-GitHub-Api-Version: 2026-03-10` to lock the response shape.
- Omitting the header defaults to `2022-11-28`, the older of the two
  supported versions (per
  [docs.github.com/en/rest/about-the-rest-api/api-versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions)).
- The `type` field on issue creation is recently added for issue types and
  is not universally supported across all clients yet.

## Create an issue

`POST /repos/{owner}/{repo}/issues`:

```python
def create_bug(title, body, severity, priority, labels=None):
    payload = {
        "title": title,
        "body": body,
        "labels": (labels or []) + [
            "bug",
            f"severity:{severity}",
            f"priority:{priority}",
        ],
    }
    r = requests.post(f"{BASE}/issues", json=payload, headers=HEADERS)
    r.raise_for_status()
    return r.json()
```

Required parameter is `title`. Optional: `body`, `assignees`, `milestone`,
`labels`, `type`.

## Label conventions

Since GitHub has no first-class severity / priority field, teams adopt
label prefixes:

| Convention | Example labels |
|---|---|
| Severity | `severity:critical`, `severity:high`, `severity:medium`, `severity:low`, `severity:trivial` |
| Priority | `priority:p1`, `priority:p2`, `priority:p3`, `priority:p4`, `priority:p5` |
| Lifecycle | `status:triage`, `status:confirmed`, `status:in-progress`, `status:in-review`, `status:verified`, `status:wontfix`, `status:duplicate` |
| Defect type | `type:regression`, `type:performance`, `type:security` |
| Component | `component:auth`, `component:payments`, `component:ui` |

Adopt them consistently - defect-report review checks that severity +
priority labels are both present.

## State transitions via PATCH

`PATCH /repos/{owner}/{repo}/issues/{issue_number}`. The `state_reason`
parameter takes `completed | not_planned | reopened | duplicate`:

```python
def close(issue_number, reason="completed"):
    """reason: completed | not_planned | duplicate"""
    r = requests.patch(
        f"{BASE}/issues/{issue_number}",
        json={"state": "closed", "state_reason": reason},
        headers=HEADERS,
    )
    r.raise_for_status()
    result = r.json()
    # verify the destructive transition landed; a stale state means a concurrent edit won
    assert result["state"] == "closed" and result["state_reason"] == reason, result
    return result

def reopen(issue_number):
    r = requests.patch(
        f"{BASE}/issues/{issue_number}",
        json={"state": "open", "state_reason": "reopened"},
        headers=HEADERS,
    )
    r.raise_for_status()
    return r.json()
```

Map canonical lifecycle states via labels + close-reason:

| Canonical | GitHub representation |
|---|---|
| New | open + `status:triage` |
| Open / Acknowledged | open + `status:confirmed` |
| Assigned | open + `status:confirmed` + assignees set |
| In Progress | open + `status:in-progress` + linked draft PR |
| Fixed | open + `status:in-review` + ready PR |
| Verified | open + `status:verified` |
| Closed (success) | closed + `state_reason: completed` |
| Reopened | open + `state_reason: reopened` |
| Deferred / Wontfix | closed + `state_reason: not_planned` + label `status:wontfix` |
| Rejected | closed + `state_reason: not_planned` + label `not-a-bug` |
| Duplicate | closed + `state_reason: duplicate` + comment `Duplicate of #N` |

## Search and comments

```python
def search_issues(q):
    r = requests.get(
        "https://api.github.com/search/issues",
        params={"q": f"repo:{os.environ['GITHUB_REPO']} {q}"},
        headers=HEADERS,
    )
    r.raise_for_status()
    return r.json()["items"]

dupes = search_issues(
    f'type:issue is:open label:bug "{title_safe}" in:title,body'
)

def add_comment(issue_number, body):
    r = requests.post(
        f"{BASE}/issues/{issue_number}/comments",
        json={"body": body}, headers=HEADERS)
    r.raise_for_status()
    return r.json()
```

GitHub search has a 30-request-per-minute unauthenticated / higher
authenticated rate limit.

## Worked example

File a bug from a CI failure idempotently:

```python
def create_or_attach(title, body):
    dupes = search_issues(f'is:open label:bug "{title}" in:title')
    if dupes:
        add_comment(dupes[0]["number"], f"Recurred: {body[:500]}")
        return dupes[0]["number"]
    issue = create_bug(title, body, severity="medium", priority="p3")
    return issue["number"]
```

Verify: `search_issues` ranks by relevance and can return near-misses, so
before attaching to or bulk-closing a hit, assert its `title` matches the
target; skip and log any that do not rather than commenting on or closing
the wrong issue, then re-run the dedupe against the corrected query.

## Parsing results

Create response includes `number` (per-repo), `html_url` (permalink),
`node_id` (GraphQL ID for Projects v2 cross-ref). Search response includes
`items` (issues + PRs), `total_count`, and `incomplete_results` (set to
`true` on partial results due to rate limit).

## Projects v2 status updates

For richer state (e.g., a Kanban with custom columns), Projects v2 requires
GraphQL - the REST API doesn't reach Projects v2:

```python
PROJECTS_MUTATION = """
mutation MoveItem($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
  updateProjectV2ItemFieldValue(
    input: { projectId: $projectId, itemId: $itemId,
             fieldId: $fieldId, value: { singleSelectOptionId: $optionId } }
  ) { projectV2Item { id } }
}
"""
# Discovery of projectId, itemId, fieldId, optionId via the matching queries.
```

Per docs.github.com/en/issues/planning-and-tracking-with-projects.

## gh CLI for scripts

The `gh` CLI handles auth via the user's stored credentials, so scripted
workflows skip token wiring (per cli.github.com/manual/gh_issue):

```bash
# Create
gh issue create \
  --title "Checkout fails for promo X" \
  --body-file failure.md \
  --label bug,severity:high,priority:p2

# Close with reason
gh issue close 1234 --reason completed
gh issue close 1234 --reason "not planned"

# Search
gh issue list --search 'is:open label:bug "checkout fails"'
```

## CI integration

```yaml
# .github/workflows/test.yml
- name: Run tests
  id: tests
  run: pytest --junitxml=results.xml
  continue-on-error: true

- name: File issue on test failure
  if: steps.tests.outcome == 'failure'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITHUB_REPO: ${{ github.repository }}
  run: python scripts/file-github-bug.py results.xml
```

Use the auto-provided `GITHUB_TOKEN` for in-repo automation; for
cross-repo, use a fine-grained PAT.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Closing without `state_reason` | Defaults to `completed` - wrong for not-a-bug / duplicate | Always set `state_reason` explicitly |
| Severity / priority in title prefix | "[CRITICAL]" prefixes - not searchable; not filterable | Use labels |
| Free-form status labels per team | Cross-team queries break | Adopt the canonical label vocabulary above |
| Search-rate-limit ignored | Bulk dedupe scripts get 403s | Throttle to 30 req/min unauth, 5000 authenticated |
| No `X-GitHub-Api-Version` header | Future API changes silently break code | Always set the version header |
| Plain-text body (no Markdown) | Loses code-block formatting | Use Markdown in `body` |

## Limitations

- **Open / closed only.** Rich lifecycle expressed via labels + Projects
  requires team discipline; the API doesn't enforce it.
- **No native severity / priority fields.** Conventions vary across orgs -
  the workflow is portable only if the team adopts the label vocabulary
  above.
- **Projects v2 is GraphQL.** REST + GraphQL hybrid; engineers need both.
- **Cross-repo dedupe.** GitHub Issues are per-repo; cross-repo duplicate
  detection needs the Search API with an `org:` qualifier.

## References

- GitHub Issues REST API -
  [docs.github.com/en/rest/issues/issues](https://docs.github.com/en/rest/issues/issues).
- GitHub Search API -
  docs.github.com/en/rest/search/search#search-issues-and-pull-requests.
- API versions -
  [docs.github.com/en/rest/about-the-rest-api/api-versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions).
