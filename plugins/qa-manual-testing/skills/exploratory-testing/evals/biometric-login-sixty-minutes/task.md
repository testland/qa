# Security sent eleven angles and I have sixty minutes

## Problem Description

We are turning on fingerprint and face unlock in the retail banking app next
sprint. The app-sec team reviewed the design and came back with a list of
eleven things they would like exercised by hand before we enable it for the
5% rollout cohort.

I have sixty minutes of one senior tester's time. That is the whole budget -
he is on incident cover for the rest of the week and the rollout gate is
Wednesday morning.

The risk that actually matters to the bank is someone else getting into an
account: the enrolled biometric being accepted for the wrong customer, or a
biometric staying valid after the customer's device or credentials should
have invalidated it. Everything else on the list is real but is not what
would put us in front of the regulator.

Rooted and jailbroken device handling is being covered by the vendor
penetration test in two weeks, and we have no rooted handsets in the lab
anyway. Do not plan for it.

Give me something the tester can pick up cold on Wednesday at 08:00 and a
report I can attach to the rollout gate ticket by 09:30.

## Output Specification

Produce a single file: `docs/security/biometric-gate-check.md`.

It must contain:

1. One stated objective for the sixty minutes: the area, what the tester
   uses, and what the bank needs to know before the gate.
2. A decision on the app-sec list: which of the eleven angles are worked in
   this hour, which are deliberately not, and why - each with a one-line
   justification tied to the risk above.
3. Concrete things to try, derived from the angles you kept.
4. How the tester records findings during the hour, split so a reader can
   tell a defect apart from an observation that needs an app-sec ruling.
5. The report attached to the gate ticket: what was covered, what was found,
   what was not reached, what obstructed the hour, and the tester's own read
   on whether the 5% rollout should proceed.
6. What the next block of testing should target if the rollout is held.

Budget: 60 minutes, one tester, single sitting, no second attempt before the
gate. Out of scope: rooted and jailbroken devices, the vendor penetration
test scope, and back-end key management.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/biometric-unlock-brief.md ===============
# Biometric unlock - pre-rollout brief

**Rollout:** 5% cohort, Wednesday. Platforms: iOS 17+, Android 13+.

## How it works

- Enrolment happens after a successful password login; the app stores a
  device-bound key in the platform keystore and registers a key handle
  with our auth service.
- Unlock presents the platform biometric prompt. On success the app
  releases the key and exchanges it for an access token.
- Adding a new fingerprint or face on the device invalidates the platform
  key; the app is expected to fall back to password and re-enrol.
- A password change on web is expected to revoke all registered key
  handles server-side.
- Three failed biometric attempts falls back to password. Five failed
  password attempts locks the account for 15 minutes.

## App-sec review - angles requested

1. Enrolment while a second customer profile is signed in on the same device
2. Biometric acceptance after a new fingerprint is added to the device
3. Key handle reuse after a web password change
4. Access-token lifetime after biometric unlock vs password login
5. Behaviour when the device biometric hardware is disabled mid-flow
6. Fallback path after three failed biometric attempts
7. Screenshot and screen-recording exposure on the unlock screen
8. Accessibility service interaction with the biometric prompt
9. Behaviour when the device clock is moved backwards
10. Enrolment on a device already enrolled for a different customer
11. Logout, then unlock, on a shared demo device

## Known state

- The revoke-on-password-change call was added three weeks ago and is
  fire-and-forget; failures are logged, not retried.
- QA lab has 4 handsets, all clean, two iOS and two Android. Two customer
  test profiles exist, both with password login working.
- The auth service staging log is searchable and shows key-handle
  registration and revocation events.
