# Applicants are getting back inside a submitted application

## Problem Description

New customers open an account through a four step wizard: identity, address,
income, then a review screen where they confirm and submit. Each step has Next
and Back, plus Save and exit, which keeps the draft and drops them at the same
step when they come back. Sessions expire after 30 minutes of inactivity and
the applicant is bounced to the sign-in page.

Once they submit, the application goes to compliance and the wizard is done.
The submitted screen has no Next, no Back and no Save and exit - the buttons
are simply not rendered.

Support has three tickets from the last fortnight that all start after the
submit. One applicant pressed the browser Back button on the confirmation
screen, landed on the review step with all their answers still in the boxes,
changed their income figure and pressed Submit again; compliance received two
applications with different numbers and the same reference. One had the step
URL bookmarked from an earlier session and opened it after submitting. One
left the wizard open in a second tab, worked in the first tab through to
submit, then carried on clicking Next in the old tab.

Our test pack covers the wizard by clicking through it. Every case starts at
step one and uses the buttons on screen, and the pack has never once tried to
get anywhere the buttons do not go.

## Output Specification

Produce `docs/onboarding-wizard-tests.md` containing:

1. The model the cases come from: for each step or state the application can
   be in, what each of the four things that can happen to it does.
2. Numbered manual test cases with steps and per-step expected results. Where
   a case needs to do something the on-screen controls do not offer, the steps
   must say how the tester gets there.
3. A separate, clearly labelled list of anything the spec does not settle,
   phrased as questions for the BA.

The identity-verification vendor, the compliance queue, and field-level
validation rules are out of scope. Do not write code.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/onboarding-wizard.md ===============
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
