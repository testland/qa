# Tracker-vocabulary map

The canonical ISTQB / IEEE lifecycle maps to platform-specific
terminology across Jira, Linear, and GitHub Issues.

| ISTQB / IEEE | Jira (default workflow) | Linear (default workflow) | GitHub Issues (default + Projects) |
|---|---|---|---|
| New | To Do | Backlog | Open + label `triage` |
| Open | In Triage (custom) | Todo | Open + label `confirmed` |
| Assigned | (Assignee set) | In Progress + assignee | Open + assignee |
| In Progress | In Progress | In Progress | Open + linked PR draft |
| Fixed | In Review | In Review | Open + linked PR ready |
| Verified | Done (pre-release) | Done | Closed (PR merged) - but often kept Open until verified |
| Closed | Done | Done | Closed |
| Reopened | Reopened | Reopened (custom) | Reopened |
| Deferred | Won't Do (deferred subtype) | Cancelled (with reason) | Closed not-planned |
| Rejected | Won't Do / Cannot Reproduce | Cancelled with reason | Closed not-planned + label `not-a-bug` |
| Duplicate | Resolved as Duplicate (link to canonical) | Cancelled with `Duplicate of:` link | Closed + comment `Duplicate of #N` |

Per the platform docs (Atlassian "Issue workflow", Linear "Workflow
states", GitHub "Issue templates"):

- Jira workflow is **fully configurable** - the table reflects the
  default Software project template.
- Linear workflow states are **fixed enums** (Backlog, Todo, In
  Progress, In Review, Done, Cancelled) but each can be subdivided
  per team.
- GitHub Issues has only **Open / Closed** as states; richer
  lifecycle requires Projects (status column) + labels.
