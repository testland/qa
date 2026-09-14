# What shipped into the assistant, 2026-07-31 to 2026-09-10

- Eleven prompt changes across the window, roughly two a week. No two on the
  same night.
- Model snapshot unchanged throughout: `gpt-5.4-mini-2026-04-02`. No provider
  migration, no short-name resolution change in this family in the window.
- Dataset `golden-v4.2.0.jsonl` published 2026-08-14. Sixty cases added covering
  the new plan-comparison flow; nothing removed. Total stays at 1000 because
  sixty superseded cases were retired in the same bump.
- Dataset `golden-v4.4.0.jsonl` published 2026-09-04. Forty cases added for the
  procurement questionnaire flow; forty retired. Total stays at 1000.
- Each dataset bump was published straight to the nightly job on the day. No
  separate capture run was made for either version.
- Artifact retention across the org is 30 days. Anything produced before
  2026-08-11 is no longer downloadable.
