# We shipped 7.3 with a broken password reset and the release page said zero failures

## Problem Description

Tidewater, iOS, monthly release train. The verify job runs the UI tests on a
pinned simulator and writes the one-page report that goes on the release ticket.
Nobody reads the raw output; they read that page and sign it.

7.3 shipped on 2026-09-04. The page said "UI tests: 0 failures" and two people
signed it. Password reset was broken in production at the time and had been since
the backend deploy on 2026-08-30. We found out on 2026-09-06 from a customer who
could not get a reset link. Support had 31 tickets open by then.

`TidewaterUITests` and `AccountUITests` are 18 test methods between them.
`testResetPasswordSendsEmail` and `testSignOutClearsSession` both went red during
that 7.3 run. The job finished green. I have attached the page as it was
generated, the tail of the raw console output the runner captured, the verify
script, the test plan the release configuration uses, the ticket for the last
change anyone made to that plan, and the support note.

Three more things in the same area, since we are opening it up:

- Rob's view is that the report step needs a tighter pattern — match on the line
  xcodebuild prints for a failed test case rather than on anything containing
  "error:" — and that it would have caught this. I would like that looked at
  properly rather than taken on trust. We have now had one release go out behind
  a number that was not true and the cost of a second one is another customer
  telling us about it.
- Priya wants a separate nightly that runs the whole suite five times over and
  reports which tests did not agree with themselves, so we can tell a genuinely
  unstable test from a broken one. It would not gate anything.
- Kwame started adding a step that pulls the structured results out of the run so
  we can put a per-test table on the ticket instead of a single number. It worked
  on his machine in August and stopped working after the toolchain bump on
  2026-09-01. His terminal output is attached and he is blocked.

And when Nadine went to look at the two failures on 2026-09-07 there was nothing
in the job's artifacts for that run at all.

The sign-in tests are not the issue here. `SignInUITests` is attached for
context; leave it alone.

## Output Specification

1. Rewrite `scripts/verify-release.sh` so that the numbers on the release page
   are the run's own numbers and a run that did not pass fails the step.
2. Change whatever else has to change so that a run like 7.3 cannot produce that
   page again.
3. Edit `.github/workflows/release-verify.yml` so that whoever picks up a failed
   run two days later can still see what happened.
4. Unblock Kwame: the structured extraction must work on the current toolchain.
5. Write `docs/release-7.3-postmortem.md` explaining how the page came to say
   zero, with a verdict on Rob's suggestion and on Priya's.
6. Do not modify `TidewaterUITests/SignInUITests.swift`.

## Input Files

Extract the following files before beginning.

=============== FILE: scripts/verify-release.sh ===============
#!/bin/bash
set -e

VERSION="${1:?usage: verify-release.sh <version>}"
LOG=build/tests.log
REPORT="reports/release-${VERSION}.md"

mkdir -p build reports

xcodebuild test \
  -project Tidewater.xcodeproj \
  -scheme Tidewater \
  -testPlan Release \
  -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.5' \
  -resultBundlePath build/result.xcresult \
  | tee build/test.log

FAILS=$(grep -c "error:" "$LOG" 2>/dev/null || true)

{
  echo "# Tidewater ${VERSION} release verification"
  echo
  echo "- Simulator: iPhone 15 / iOS 17.5"
  echo "- UI tests: ${FAILS:-0} failures"
  echo "- Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$REPORT"

echo "wrote $REPORT"

=============== FILE: Tidewater.xctestplan ===============
{
  "configurations" : [
    {
      "id" : "5E0C1A9E-3D77-4F1B-B0E6-8C9A21D4E5F0",
      "name" : "Release",
      "options" : {
        "maximumTestRepetitions" : 3,
        "testRepetitionMode" : "retryOnFailure"
      }
    }
  ],
  "defaultOptions" : {
    "codeCoverage" : false,
    "maximumTestExecutionTimeAllowance" : 600,
    "targetForVariableExpansion" : {
      "containerPath" : "container:Tidewater.xcodeproj",
      "identifier" : "A1B2C3D4E5F60718293A4B5C",
      "name" : "Tidewater"
    },
    "testTimeoutsEnabled" : true
  },
  "testTargets" : [
    {
      "target" : {
        "containerPath" : "container:Tidewater.xcodeproj",
        "identifier" : "F0E1D2C3B4A596871A2B3C4D",
        "name" : "TidewaterUITests"
      }
    },
    {
      "target" : {
        "containerPath" : "container:Tidewater.xcodeproj",
        "identifier" : "C4D5E6F708192A3B4C5D6E7F",
        "name" : "AccountUITests"
      }
    }
  ],
  "version" : 1
}

=============== FILE: .github/workflows/release-verify.yml ===============
name: release-verify

on:
  workflow_dispatch:
    inputs:
      version:
        required: true

jobs:
  verify:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v5

      - name: Verify release
        run: bash scripts/verify-release.sh "${{ inputs.version }}"

      - name: Tidy build dir
        run: rm -rf build

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: release-verify
          path: |
            reports/
            build/

=============== FILE: reports/release-7.3.md ===============
# Tidewater 7.3 release verification

- Simulator: iPhone 15 / iOS 17.5
- UI tests: 0 failures
- Generated: 2026-09-04T09:18:07Z

Signed off: @rob 2026-09-04 09:31
Signed off: @priya-qa 2026-09-04 09:44

=============== FILE: reports/raw-tail-7.3.txt ===============
tail of the console output the runner captured for the 7.3 verify job

Test Case '-[TidewaterUITests testSignInWithValidCredentials]' passed (11.402 seconds).
Test Case '-[TidewaterUITests testSignInRejectsWrongPassword]' passed (10.118 seconds).

Test Case '-[AccountUITests testResetPasswordSendsEmail]' started.
    t =    14.21s Assertion Failure: AccountUITests.swift:38: XCTAssertTrue failed
Test Case '-[AccountUITests testResetPasswordSendsEmail]' failed (16.884 seconds).
Test Case '-[AccountUITests testResetPasswordSendsEmail]' started (Attempt 2 of 3).
    t =    13.90s Assertion Failure: AccountUITests.swift:38: XCTAssertTrue failed
Test Case '-[AccountUITests testResetPasswordSendsEmail]' failed (16.102 seconds).
Test Case '-[AccountUITests testResetPasswordSendsEmail]' started (Attempt 3 of 3).
Test Case '-[AccountUITests testResetPasswordSendsEmail]' passed (15.740 seconds).

Test Case '-[AccountUITests testSignOutClearsSession]' started.
    t =     9.77s Assertion Failure: AccountUITests.swift:52: XCTAssertEqual failed:
                  ("Signed in as priya@tidewater.example") is not equal to ("Signed out")
Test Case '-[AccountUITests testSignOutClearsSession]' failed (12.309 seconds).
Test Case '-[AccountUITests testSignOutClearsSession]' started (Attempt 2 of 3).
Test Case '-[AccountUITests testSignOutClearsSession]' passed (11.884 seconds).

Test Suite 'All tests' passed at 2026-09-04 09:18:02.117.
     Executed 21 tests, with 0 failures (0 unexpected) in 388.221 seconds

** TEST SUCCEEDED **

=============== FILE: reports/tide-2210.md ===============
# TIDE-2210 - stop the release train being held up by simulator flakes

Closed 2026-06-18, @rob.

> Three of the last five trains have been held for a single red UI test that was
> green on the rerun. I am putting retry-on-failure on the Release configuration
> with three repetitions. If a test passes on any attempt the plan reports it as
> a pass, which is what a human does anyway when they hit Rerun. Train held zero
> times since.

Change: `Tidewater.xctestplan`, Release configuration only. Not applied to the
PR or nightly configurations, which do not exist yet.

=============== FILE: reports/support-note-7.3.md ===============
# Password reset - what support saw

- 2026-08-30: backend deploy 7.2.4. `POST /v1/account/reset` starts returning
  500. Measured over the week: it fails for roughly two requests in three.
- The app retries a failed reset once automatically and then shows the
  "Check your email" screen only if a request got through. A customer who taps
  Send three or four times usually gets a link eventually. Most gave up.
- 31 tickets between 2026-08-31 and 2026-09-06. First one escalated 2026-09-06.
- `testResetPasswordSendsEmail` drives the same button once and waits for the
  "Check your email" screen.

=============== FILE: reports/kwame-terminal-2026-09-08.txt ===============
$ sw_vers -productVersion
15.5
$ xcodebuild -version
Xcode 16.2
Build version 16C5032a

$ ls build
result.xcresult

$ xcrun xcresulttool get --path build/result.xcresult --format json > build/results.json
xcresulttool: error: This command is deprecated. Pass --legacy to keep using it;
it will be removed in a future release.

$ xcrun xcresulttool get --path build/result.xcresult --format json --legacy | head -c 200
{"_type":{"_name":"ActionsInvocationRecord"},"actions":{"_type":{"_name":"Array"}, ...

(worked in August on the old toolchain without the flag. I do not want to ship
something that tells me it is going away - what is the current way to do this?)

=============== FILE: TidewaterUITests/SignInUITests.swift ===============
import XCTest

final class SignInUITests: XCTestCase {

    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launchArguments = ["-resetKeychain"]
        app.launch()
    }

    func testSignInWithValidCredentials() {
        app.textFields["sign-in-email"].tap()
        app.textFields["sign-in-email"].typeText("priya@tidewater.example")
        app.secureTextFields["sign-in-password"].tap()
        app.secureTextFields["sign-in-password"].typeText("correcthorsebattery")
        app.buttons["sign-in-submit"].tap()

        let home = app.otherElements["home-screen"]
        XCTAssertTrue(home.waitForExistence(timeout: 15))
        XCTAssertEqual(app.staticTexts["signed-in-as"].label, "Signed in as priya@tidewater.example")
    }

    func testSignInRejectsWrongPassword() {
        app.textFields["sign-in-email"].tap()
        app.textFields["sign-in-email"].typeText("priya@tidewater.example")
        app.secureTextFields["sign-in-password"].tap()
        app.secureTextFields["sign-in-password"].typeText("nope")
        app.buttons["sign-in-submit"].tap()

        let error = app.staticTexts["sign-in-error"]
        XCTAssertTrue(error.waitForExistence(timeout: 15))
        XCTAssertEqual(error.label, "Email or password is incorrect")
        XCTAssertFalse(app.otherElements["home-screen"].exists)
    }
}
