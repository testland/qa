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
