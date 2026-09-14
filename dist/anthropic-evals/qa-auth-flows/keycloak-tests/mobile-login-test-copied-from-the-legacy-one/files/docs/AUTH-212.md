# AUTH-212 - integration coverage for mobile sign-in

Status: In Progress
Assignee: was @dpowell, now @rkhan
Due: 2026-09-30 (store submission)
Blocks: AUTH-213 (refresh), AUTH-214 (logout)

## Why the sign-in changed at all

The 4.x apps signed in through a screen we drew ourselves inside the app. Three
things pushed us off it: the store review team flagged the in-app credential
form in June, we cannot add the second factor the security review asked for
without rewriting that screen anyway, and the web portal is moving to the same
arrangement next quarter so we would rather have one thing to maintain.

The 5.0 apps do not draw a sign-in screen. The user lands on a page the identity
server serves, types their credentials there, and the app is handed back control
on its own URL scheme. That work is finished, shipped to TestFlight on 2026-09-05
and to the internal Android track the same day, and `mobile-app` in the test realm
was configured to match it.

## What the store review actually asked for

The second factor is AUTH-231 and is not in this release. What is in this release
is that the credentials are never seen by our code - they are entered on the
identity server's own page, in its own session. That is the property the store
review was after and the one the release is being made for.

## What is left

- Integration coverage for the new sign-in (this ticket).
- Nothing else. Refresh and logout are AUTH-213 and AUTH-214.

## Notes from the handover call

@dpowell walked @rkhan through `conftest.py` and the realm import, which he
considers settled and does not want reopened. He did not get as far as writing
the test.
