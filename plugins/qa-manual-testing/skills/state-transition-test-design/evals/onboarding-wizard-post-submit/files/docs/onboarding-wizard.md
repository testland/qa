# Account opening wizard - spec

## Steps and states

| State | URL | Screen |
|---|---|---|
| Identity | /onboarding/step/1 | Name, date of birth, ID number |
| Address | /onboarding/step/2 | Current address, time at address |
| Income | /onboarding/step/3 | Employment, annual income |
| Review | /onboarding/step/4 | Read-back of all answers, Submit |
| Submitted | /onboarding/done | Reference number, "with compliance" |
| Expired | /signin | Sign-in page with "your session ended" |

## Things that can happen

| Event | Control |
|---|---|
| next | Next button, and Submit on the review step |
| back | Back button |
| save-and-exit | Save and exit link in the header |
| session-timeout | 30 minutes of inactivity |

Four events. Nothing else moves an application through the wizard.

## Rules

- Next moves to the following step; on the review step it submits.
- Back returns to the preceding step with the answers still populated. There
  is nothing before the identity step.
- Save and exit stores the draft and closes the wizard. Reopening it puts the
  applicant back on the step they left.
- A session that times out sends the applicant to the sign-in page.
- A submitted application is with compliance. The wizard is finished and the
  done screen renders none of the three controls.

## Open with the BA

The behaviour after a session times out has never been written down. The
sign-in page appears, but what the applicant gets when they sign back in - the
step they were on, the first step, the draft, an empty wizard - is not in this
document and the two developers who have worked on it remember it differently.

## Note from the frontend

The wizard is a single page app; steps are routes. Every step URL is directly
addressable, browser history works normally, and the native app's swipe-back
gesture maps to the same route change as the Back button. Hiding a control
removes the button, not the route.
