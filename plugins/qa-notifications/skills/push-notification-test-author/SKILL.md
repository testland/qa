---
name: push-notification-test-author
description: "Build-an-X for push notification tests (push notifications, web push, FCM / APNs push messages) across Web Push (RFC 8030 / VAPID), Apple Push Notification Service (APNs), and Firebase Cloud Messaging (FCM) - covers subscription handshake, payload encryption, badge / sound / click-action assertions, expired-subscription cleanup, silent-vs-alert, and topic-vs-targeted routing; also carries the in-app notification test workflow (WebSocket / SSE / Firebase-listener delivery, read-unread state, multi-session fan-out, offline-then-reconnect) in references/in-app.md. Use when authoring tests for any push or in-app notification flow."
---

# push-notification-test-author

## Overview

Three push platforms dominate:

| Platform | Standard / Provider |
|---|---|
| **Web Push** | IETF RFC 8030 + VAPID (RFC 8292) |
| **APNs** (iOS / iPadOS / macOS) | Apple proprietary HTTP/2 |
| **FCM** (Android + cross-platform) | Google Firebase |

Each platform has distinct test patterns; Step 1 picks the isolation
level and Steps 2-4 cover each platform.

## When to use

- The repo sends push notifications via any of the three platforms.
- A regression suite needs to verify push payload shape, click
  actions, badge counts.
- Compliance review needs evidence that revoked subscriptions are
  cleaned up.
- The team integrates with FCM / APNs / Web Push directly (not
  via OneSignal-style abstractions).

## How to use

1. Identify which push platform(s) the app targets - Web Push, APNs, FCM, or a mix (Overview).
2. Pick the isolation level; default to mocking the SDK send method (Step 1).
3. Author the happy-path payload-shape test for each channel (Steps 2 - 4, [references/platform-test-patterns.md](references/platform-test-patterns.md)).
4. Add the invalid-token cleanup test for the 410 / unregistered path (Steps 2 - 4).
5. Cover silent-vs-alert, deep links, and FCM topic routing (Step 5).
6. Assert sandbox-only APNs endpoints so tests never reach real users (Step 3).
7. Sabotage-check each test (Step 6), then run the Step 7 checklist.

## Step 1 - Choose the test isolation level

| Level | Example | Tradeoffs |
|---|---|---|
| Mock the SDK | Patch FCM/APNs/Web-Push library send method | Fast; misses provider-side behavior |
| Sandbox / emulator | APNs sandbox, FCM emulator (limited), web-push test browser | Realistic; slower |
| End-to-end with test devices | Real device farm | Highest fidelity; expensive + flaky |

**Default: mock the SDK** - fast, deterministic, covers payload-shape + error-path logic which is most of what regressions hit. Use sandbox/emulator when verifying provider-side behavior (encryption, rate-limit, real 410 handling); use real device farms only for grouped-notification / channel UX work.

## Step 2 - Web Push tests

Mock `webPush.sendNotification`, assert the payload, and test that a
`410 Gone` from the push service deletes the stored subscription
([RFC 8030 §6.2][rfc8030] - the subscription has expired or been
revoked). Add a service-worker test that dispatches a synthetic
`PushEvent` and asserts `showNotification` gets the right title and
body. Recipes: [references/platform-test-patterns.md](references/platform-test-patterns.md).

## Step 3 - APNs tests

Mock the APNs client, assert the `aps` payload, and test that a 410
with reason `Unregistered` removes the device token
([sending requests to APNs][apns-send]). Assert the client is built for
`api.sandbox.push.apple.com` in every test and CI configuration;
`api.push.apple.com` reaches real users.

## Step 4 - FCM tests

Use the HTTP v1 API: the legacy HTTP and XMPP APIs were deprecated on
20 June 2023 and their shutdown began on 22 July 2024
([FCM migration guide][fcm-v1]). Mock `admin.messaging().send`, assert
the message (`token` or `topic`, `notification`, `data`, `android`,
`apns`), and test that `messaging/registration-token-not-registered`
removes the token.

## Step 5 - Payload variants: silent, deep link, topic

Code for each is in the "Payload variants" section of
[references/platform-test-patterns.md](references/platform-test-patterns.md).
What each test must assert:

| Variant | Assert |
|---|---|
| Silent (background) push, APNs | `aps` holds only `content-available: 1` (no `alert`, `sound`, `badge`); request headers `apns-push-type: background` and `apns-priority: 5`. The system may throttle or drop these, so the app must not depend on every one arriving ([background updates][apns-bg]) |
| Alert push | `alert` title and body present; `apns-push-type: alert` |
| Deep link | The payload's link / `data` route points at the exact screen (`/orders/123`), built from the entity id, not a constant |
| FCM topic | Subscribe call uses the topic name the sender publishes to; a send to that topic uses `topic`, not `token` |

Opening the deep link on a device needs device automation
(`appium-testing`, `espresso-suite`, `xcuitest-suite`).

## Step 6 - Check the suite catches regressions

Before calling the suite done, prove each test can fail:

1. Comment out the token / subscription delete in the cleanup handler:
   the 410 / `Unregistered` / `registration-token-not-registered` tests
   must go red. Restore it.
2. Change the deep-link builder to a constant route: the deep-link test
   must go red.
3. Add `alert` to the silent payload: the silent-push test must go red.
4. `grep -rn "api.push.apple.com" tests/ config/test*`: no hits.

A test that stays green through its own sabotage is not testing the
path; fix the assertion (usually it asserts on the mock call instead of
the stored state) and repeat.

## Step 7 - Per-channel checklist

For each channel the app uses:

1. Happy-path send with correct payload (Steps 2-4)
2. Invalid-token cleanup asserted on stored state (Steps 2-4)
3. Silent vs alert payload and headers (Step 5)
4. Deep link (Step 5)
5. Topic routing (FCM, Step 5)
6. Sandbox-only endpoints in tests (Step 3)
7. Each test seen failing once (Step 6)

## Worked example

An e-commerce app sends a Web Push "order shipped" notification and must clean up revoked subscriptions.

1. Platform: Web Push only (Overview). Isolation: mock `webPush.sendNotification` (Step 1 default).
2. Happy path: a test drives `pushOrderUpdate(sub, { orderId: 123, status: 'shipped' })` and asserts `sendNotification` was called with a payload string containing `"orderId":123`. The mock returns `{ statusCode: 201 }`; the assertion passes.
3. Revocation: a second test mocks `sendNotification` to reject with `{ statusCode: 410 }`. After `pushOrderUpdate` runs, the test asserts the subscription row is gone from storage (`Subscription.findOne(...)` returns null), proving the 410 cleanup path per RFC 8030.
4. Service-worker side: dispatch a synthetic `PushEvent` whose `data.json()` returns the order payload; assert `self.registration.showNotification` was called with body `shipped`.
5. Result: three passing tests - payload shape, 410 cleanup, and SW render - cover the whole Web Push channel. Repeat the [references/platform-test-patterns.md](references/platform-test-patterns.md) recipes for APNs / FCM if the app adds those channels.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only happy path | Miss expired-token cleanup; storage grows; spam to dead devices | Step 2-4 410 / 404 / unregistered tests |
| Hardcode VAPID public key in tests + checked into repo | Key rotation breaks tests | Inject via env var |
| Send to real production APNs in tests | Real users get test push | Sandbox environment (Step 3) |
| Silent payload with `alert` or without `apns-push-type: background` / `apns-priority: 5` | Not delivered as a background update | Step 5 |
| Skip deep-link test | Deep links break silently after refactors | Step 5 |
| Cleanup test asserts only that the mock was called | Passes when the delete is gone | Assert stored state; sabotage check (Step 6) |
| FCM legacy server key / `fcm.googleapis.com/fcm/send` | Legacy API shut down from July 2024 | HTTP v1 (Step 4) |

## Limitations

- This is a build-an-X workflow. Tests use the application's chosen
  push library + mocks at the SDK boundary.
- APNs sandbox has rate limits; high-volume CI may need to mock vs
  real sandbox.
- FCM emulator coverage is limited; many provider-side behaviors
  require real FCM (sandbox / dev project).
- Push-notification UX (e.g., grouped notifications, notification
  channels on Android) requires device-side testing (Espresso /
  XCUITest); see qa-mobile plugins.
- iOS notification permissions UI flow is OS-managed; tests cover
  app-side request + handle response.

## References

- [references/platform-test-patterns.md](references/platform-test-patterns.md) - full Web Push / APNs / FCM test-pattern code
- [references/in-app.md](references/in-app.md) - in-app notification workflow (WebSocket / SSE / Firebase listeners, unread state, fan-out, reconnect); Firebase listener patterns in [references/firebase-listener-tests.md](references/firebase-listener-tests.md)
- [RFC 8030][rfc8030] - Web Push Protocol (410 for an expired subscription)
- IETF RFC 8291 - Message Encryption for Web Push
- IETF RFC 8292 - VAPID for Web Push
- [Apple: sending notification requests to APNs][apns-send] - endpoints, headers, error reasons
- [Apple: pushing background updates][apns-bg] - silent push payload, headers, throttling
- [Apple User Notifications][apns-docs]
- [FCM: migrate from legacy APIs to HTTP v1][fcm-v1] - deprecation and shutdown dates
- web.dev/explore/notifications - Push API + Notifications API
- npmjs.com/package/web-push - Node.js web-push library
- pypi.org/project/apns2 - Python APNs HTTP/2 library
- `mailpit-testing` (email flows in its references),
  `sms-test-author` - sister channels
- `appium-testing`,
  `xcuitest-suite`,
  `espresso-suite` - device-side click-action verification

[apns-docs]: https://developer.apple.com/documentation/usernotifications
[apns-send]: https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns
[apns-bg]: https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app
[rfc8030]: https://www.rfc-editor.org/rfc/rfc8030
[fcm-v1]: https://firebase.google.com/docs/cloud-messaging/migrate-v1
