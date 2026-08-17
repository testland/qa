# Standing up device tests from zero, and the first attempt does not run anywhere

## Problem Description

We have no device-level tests. Our web suite is in good shape and the team
wants the mobile one to look like it, but nobody here has set up device
automation before. An intern started it in the summer: they added a setup
script and two npm scripts, then left. The npm scripts point at files that were
never written, and the setup script does not get a machine into a working
state.

We know that much because the intern left their notes. The automation server
does install and it does start - it prints its banner and listens on the port.
The very first session request they made came back with the server saying it
could not find anything able to automate the platform they asked for. The two
of us who tried again this week got the same thing on our own laptops, on both
the Android and the iOS side.

The other complaint in the notes is that the script exits 0 on a machine that
cannot run anything, so you only discover the problem when a test fails
minutes later.

Half the team is on macOS and half on Linux; the Linux half will only ever run
Android. We want Android working now and iOS ready to switch on next quarter,
so the machines need to be prepared for both even though only Android has a
test today.

## Output Specification

Deliver a working starting point, not a plan:

1. Rework `scripts/setup-mobile.sh` so a clean machine finishes the script able
   to run device tests, with the platform-specific pieces installed only where
   they apply. The Linux path must succeed without the iOS toolchain.
2. Add a verification step that exits non-zero, naming what is missing, when
   the environment is not actually ready. It must check what the automation
   server itself reports, not merely that a binary is on `PATH`.
3. Write `wdio.conf.js` and `test/specs/smoke.spec.js` - the missing files the
   npm scripts already reference. The smoke test signs in and asserts the
   account screen is reached. Follow the conventions in `e2e/login.spec.js`:
   assertions on real state, no fixed sleeps, and no lookups that a design
   change would break.
4. Update `docs/onboarding.md` so a new hire following it word for word ends up
   able to run the smoke test.

Do not modify `e2e/login.spec.js` - that is the web suite and it is not part of
this work.

## Input Files

Extract the following files before beginning.

=============== FILE: scripts/setup-mobile.sh ===============
#!/usr/bin/env bash
set -euo pipefail

echo "==> installing automation server"
npm install -g appium

echo "==> installing node dependencies"
npm ci

echo "==> android sdk"
if [ -z "${ANDROID_HOME:-}" ]; then
  echo "ANDROID_HOME is not set; install Android Studio first" >&2
  exit 1
fi

echo "==> checking server"
appium --version

echo "==> done. start the server with: appium"

=============== FILE: docs/onboarding.md ===============
# Running the mobile suite locally

1. Install Node 20 and Android Studio. On macOS also install Xcode and run
   `xcode-select --install`.
2. Clone the repo and run `./scripts/setup-mobile.sh`.
3. Open a second terminal and leave the automation server running there.
4. Boot an emulator.
5. Run `npm run mobile:android`.

If step 5 fails, ask in #qa-help.

=============== FILE: docs/intern-notes.md ===============
Notes before I go - sorry this isn't finished.

Server installs fine and starts fine (`appium` prints the banner, port 4723).
Wrote a throwaway session request to check it worked and got:

    [Appium] Could not find a driver for automationName 'UiAutomator2' and
    [Appium] platformName 'Android'. Please check your desired capabilities.

Tried the same thing on Sam's MacBook against the simulator, same shape:

    [Appium] Could not find a driver for automationName 'XCUITest' and
    [Appium] platformName 'iOS'. Please check your desired capabilities.

Setup script still exits 0 in that state which feels wrong.

The app under test: package `com.acme.shop`, launch activity `.MainActivity`,
debug build lands at `./build/app-debug.apk`. iOS bundle id is `com.acme.shop`
and the simulator build lands at `./build/Shop.app`. The app already ships
accessibility identifiers on the login screen: `email-field`, `password-field`,
`sign-in`, `account-home`.

=============== FILE: e2e/login.spec.js ===============
const { test, expect } = require('@playwright/test');

test('signs in with a valid password', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Email').fill('qa@acme.test');
  await page.getByLabel('Password').fill('correct horse');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('heading', { name: /your account/i })).toBeVisible();
});

=============== FILE: package.json ===============
{
  "name": "acme-shop-tests",
  "private": true,
  "scripts": {
    "mobile:android": "wdio run wdio.conf.js",
    "web": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.0",
    "@wdio/appium-service": "^9.0.0",
    "@wdio/cli": "^9.0.0",
    "@wdio/local-runner": "^9.0.0",
    "@wdio/mocha-framework": "^9.0.0",
    "webdriverio": "^9.0.0"
  }
}
