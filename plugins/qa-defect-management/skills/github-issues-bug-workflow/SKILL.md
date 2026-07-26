---
name: github-issues-bug-workflow
description: "Author and run GitHub Issues bug workflows via REST API (2026-03-10): issue creation, state changes (open / closed with `state_reason`), label-based severity/priority classification, and comment attachment. Covers `POST /repos/{owner}/{repo}/issues`, `PATCH` for `state_reason` transitions (completed / not_planned / duplicate / reopened), and label conventions for GitHub's binary open/closed model; Projects v2, `gh` CLI, and CI wiring live in references/. Use when programmatically managing the GitHub Issues bug lifecycle; for the same workflow on another tracker use azuredevops-bug-workflow, jira-bug-workflow-runner, or linear-bug-workflow-runner."
---

# github-issues-bug-workflow

## Overview

GitHub Issues has only **two states**: open and closed. To express the
canonical defect lifecycle (`bug-lifecycle-reference`) teams supplement
Issues with **labels** (severity, priority, status) and optionally
**Projects v2** (status columns).

This skill wraps the GitHub Issues REST API (per
[docs.github.com/en/rest/issues/issues](https://docs.github.com/en/rest/issues/issues))
for create / update / close / reopen / search, and notes the Projects v2
GraphQL augmentation when richer state is needed. Version-sensitive facts
are collected under [API version](#api-version).

## When to use

- Filing a bug from a CI test failure on a GitHub-hosted project
  (consumed by
  `bug-report-from-failure`).
- Maintaining bug label / status discipline in an open-source
  project where GitHub Issues is the canonical tracker.
- Backing duplicate-defect search for GitHub-using teams.

## How to use

1. Authenticate with a token and pin the API version via the `X-GitHub-Api-Version` header (see Authentication).
2. Before filing, search open `label:bug` issues by title to dedupe (see Search).
3. Create the issue with severity / priority / status labels; express lifecycle via labels + `state_reason` on close (see Label conventions / State transitions).
4. Add Projects v2 columns, drive the gh CLI, or wire CI - all in [references/github-issues-reference.md](references/github-issues-reference.md).

## Authentication

Per GitHub REST API docs:

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

## API version

Version-sensitive facts, kept in one place so time-bound detail does not leak
through the rest of the doc:

- Pin `X-GitHub-Api-Version: 2026-03-10` (set in the Authentication headers
  above) to lock the response shape.
- Omitting the header defaults to `2022-11-28`, the older of the two supported
  versions (per
  [docs.github.com/en/rest/about-the-rest-api/api-versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions)).
- The `type` field on issue creation is recently added for issue types and is
  not universally supported across all clients yet.

## Create an issue

`POST /repos/{owner}/{repo}/issues` per the API docs:

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

Required parameter is `title`. Optional: `body`, `assignees`,
`milestone`, `labels`, `type` (see [API version](#api-version)).

## Label conventions

Since GitHub has no first-class severity / priority field, teams
adopt label prefixes:

| Convention | Example labels |
|---|---|
| Severity | `severity:critical`, `severity:high`, `severity:medium`, `severity:low`, `severity:trivial` |
| Priority | `priority:p1`, `priority:p2`, `priority:p3`, `priority:p4`, `priority:p5` |
| Lifecycle | `status:triage`, `status:confirmed`, `status:in-progress`, `status:in-review`, `status:verified`, `status:wontfix`, `status:duplicate` |
| Defect type | `type:regression`, `type:performance`, `type:security` |
| Component | `component:auth`, `component:payments`, `component:ui` |

Adopt them consistently - defect-report review checks
that severity + priority labels are both present.

## State transitions via PATCH

`PATCH /repos/{owner}/{repo}/issues/{issue_number}`. The
`state_reason` parameter (per API docs) takes
`completed | not_planned | reopened | duplicate`:

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

## Search

`GET /repos/{owner}/{repo}/issues` supports filter via query
parameters; for richer search use the search endpoint:

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
```

GitHub search has a 30-request-per-minute unauthenticated /
higher authenticated rate limit.

## Comments

`POST /repos/{owner}/{repo}/issues/{issue_number}/comments`:

```python
def add_comment(issue_number, body):
    r = requests.post(
        f"{BASE}/issues/{issue_number}/comments",
        json={"body": body}, headers=HEADERS)
    r.raise_for_status()
    return r.json()
```

## Worked example

File a bug from a CI failure idempotently: search for an open duplicate
first, comment on it if found, otherwise create a new labelled issue. This
reuses `search_issues`, `add_comment`, and `create_bug` above:

```python
def create_or_attach(title, body):
    dupes = search_issues(f'is:open label:bug "{title}" in:title')
    if dupes:
        add_comment(dupes[0]["number"], f"Recurred: {body[:500]}")
        return dupes[0]["number"]
    issue = create_bug(title, body, severity="medium", priority="p3")
    return issue["number"]

# From a failing pytest run:
num = create_or_attach(
    "Checkout fails for promo X",
    "<repro>\n1. Apply promo X\n2. Checkout 500s\n</repro>",
)
print(f"Bug tracked as #{num}")
```

Verify: `search_issues` ranks by relevance and can return near-misses, so
before attaching to or bulk-closing a hit, assert its `title` matches the
target; skip and log any that do not rather than commenting on or closing the
wrong issue, then re-run the dedupe against the corrected query.

The create response includes `number` (per-repo), `html_url` (permalink), and
`node_id` (GraphQL ID for Projects v2 cross-ref). Moving the issue across a
Projects v2 status column, the gh CLI equivalents, and CI wiring are in
[references/github-issues-reference.md](references/github-issues-reference.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Closing without `state_reason` | Defaults to `completed` - wrong for not-a-bug / duplicate | Always set `state_reason` explicitly |
| Severity / priority in title prefix | "[CRITICAL]" prefixes - not searchable; not filterable | Use labels |
| Free-form status labels per team | Cross-team queries break | Adopt the canonical label vocabulary above |
| Search-rate-limit ignored | Bulk dedupe scripts get 403s | Throttle to 30 req/min unauth, 5000 authenticated |
| No `X-GitHub-Api-Version` header | Future API changes silently break code | Always set the version header |
| Plain-text body (no Markdown) | Loses code-block formatting | Use Markdown in `body` |
| Closing with `state: closed` without `state_reason` for "wontfix" | Ambiguous closure - looks the same as a fix | Use `state_reason: not_planned` |

## Limitations

- **Open / closed only.** Rich lifecycle expressed via labels +
  Projects requires team discipline; the API doesn't enforce it.
- **No native severity / priority fields.** Conventions vary
  across orgs - the runner is portable only if the team adopts
  the label vocabulary above.
- **Projects v2 is GraphQL.** REST + GraphQL hybrid; engineers
  need both.
- **Cross-repo dedupe.** GitHub Issues are per-repo; cross-repo
  duplicate detection needs Search API with `org:` qualifier.

## References

- GitHub Issues REST API - 
  [docs.github.com/en/rest/issues/issues](https://docs.github.com/en/rest/issues/issues).
- GitHub Search API - 
  docs.github.com/en/rest/search/search#search-issues-and-pull-requests.
- API versions - 
  [docs.github.com/en/rest/about-the-rest-api/api-versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions).
- Deep reference (Projects v2 GraphQL, gh CLI, CI wiring, with their own
  citations):
  [references/github-issues-reference.md](references/github-issues-reference.md).
- Sibling references:
  `bug-lifecycle-reference`,
  `severity-vs-priority-reference`.
- Sibling skills:
  `jira-bug-workflow-runner`,
  `linear-bug-workflow-runner`.
- Consumed by:
  `bug-report-from-failure`.
