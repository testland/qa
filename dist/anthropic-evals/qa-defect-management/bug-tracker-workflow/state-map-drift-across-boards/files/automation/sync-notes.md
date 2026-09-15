# What the 03:00 sync reads, written by Piotr 2026-08-02

Per board, once a night:

- **jira-eng** - `GET /rest/api/3/project/ENG/statuses`, then the transitions
  the workflow scheme lists for the Bug issue type. Written into `transitions`.
- **linear-mobile** - the team's workflow states; the display names are written
  into `states` verbatim.
- **ado-payments / ado-platform** - the states the project's process template
  defines, written into `states`.

Not read by the sync, and still whatever was last pasted: `description_format`,
`lookup_by`, `priority_for_urgent`, `severity_field`, `update_mode`.

Known gap I have not got to: on 2026-08-18 the sync ran clean and the 09:14
transition still failed. I have not worked out why yet.
