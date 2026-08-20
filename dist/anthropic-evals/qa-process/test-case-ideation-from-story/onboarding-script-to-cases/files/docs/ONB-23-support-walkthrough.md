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
