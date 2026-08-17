# ONB-23 — New workspace onboarding wizard

**Type:** Story
**Squad:** Growth

## Story

As someone who has just signed up, I want to be walked through setting up my
workspace, so that it is usable before I am left alone with it.

## Acceptance criteria

- AC-1: The wizard runs after the first sign-in and has four steps: workspace
  name, plan, invite teammates, import data.
- AC-2: The invite step and the import step are optional and can be skipped.
- AC-3: Progress is saved as each step is completed. Signing in again resumes
  at the first incomplete step.
- AC-4: Workspace names must be unique across the account and are 2 to 40
  characters.
- AC-5: Up to 25 teammates can be invited at once by pasting addresses.
- AC-6: On completion the user lands on the empty workspace with a checklist
  card.

## Notes

A plan can be pre-selected by a query parameter when the user arrives from a
pricing page link. Invite links expire after 7 days.
