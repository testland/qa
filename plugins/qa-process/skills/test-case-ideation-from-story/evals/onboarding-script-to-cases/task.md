# The onboarding test list is just the click-through with a table around it

## Problem Description

ONB-23 rebuilds the new-workspace onboarding wizard. What the backlog carries
is a short story plus the click-through support wrote for their own use, which
is a numbered walkthrough of the current wizard.

We asked a contractor for a test list last time and got twelve rows back: step
one became row one, step two became row two, and so on to the end. Running all
twelve in order is the same as running the walkthrough once — if the wizard is
reachable at all they all pass together, and if it is not they all fail
together, so the list tells us nothing we did not already know from the first
row. Meanwhile nobody has ever tested what happens when someone abandons the
wizard halfway and comes back the next day, which is the most common thing our
users actually do.

The team runs a short confidence pass on onboarding at every release and a
fuller pass weekly, so the list has to say which rows belong where.

The walkthrough also refers to the current build's internals. The wizard is
being rebuilt, so anything tied to those will not survive the sprint.

## Output Specification

1. Produce `docs/test-cases/ONB-23.md` containing a single markdown table.
2. Every row must be worth running on its own: it must be able to fail while
   its neighbours pass, and it must tell the reader something specific when it
   does.
3. Out of scope: automated tests, the marketing site that links into the wizard,
   and the pricing of the plans themselves.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/ONB-23.md ===============
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

=============== FILE: docs/ONB-23-support-walkthrough.md ===============
# Support walkthrough — onboarding a new customer (current build)

1. Sign in as the new user.
2. Confirm the wizard appears.
3. Type a workspace name into `#company-name`.
4. Press Continue.
5. Confirm the `<PlanPicker>` component renders three plan cards.
6. Select a plan.
7. Press Continue.
8. Paste teammate addresses into the invite box, one per line.
9. Press Send invites.
10. On the import step, press Skip.
11. Confirm `POST /v2/onboarding/complete` returns 200.
12. Confirm the workspace loads with the checklist card.
