# We shipped 7.3 with two red UI tests and the release report said zero failures

## Problem Description

Tidewater, iOS, monthly release train. The verify job runs the UI tests on a
pinned simulator and writes the one-page report that goes on the release ticket.
Nobody reads the raw output; they read that page and sign.

7.3 shipped on 2026-09-04. The page said "UI tests: 0 failures". Two tests were
red on that run — `testResetPasswordSendsEmail` and `testSignOutClearsSession` —
and the job went green anyway, so nothing stopped it. We found out on 2026-09-06
from a customer who could not reset their password. I have attached the report
as it was generated and the tail of the raw output from the same run.

Two more things in the same area, since we are opening it up:

- Kwame started adding a step that pulls the structured results out of the run
  so we can put a per-test table on the ticket instead of a single number. It
  worked on his machine in August and stopped working after the toolchain bump
  on 2026-09-01. His terminal output is attached. He is blocked on it.
- When Nadine went to look at the two failures on 2026-09-07, there was nothing
  in the job's artifacts for that run. She could not see what the app looked like
  when either test failed, and by then the simulator state was long gone.

Rob's view is that the report step needs a tighter pattern — match on the line
xcodebuild prints for a failed test case rather than on anything containing
"error:" — and that it would have caught this. I would like that looked at
properly rather than taken on trust, because we have now had one release go out
behind a number that was not true, and the cost of a second one is a customer
telling us about it again.

The tests themselves are not the issue here. `SignInUITests` is attached for
context; leave it alone.

## Output Specification

1. Rewrite `scripts/verify-release.sh` so that a run with failing tests fails the
   step, and so the numbers on the release page come from the run's own record
   rather than from anything scraped out of console output.
2. Edit `.github/workflows/release-verify.yml` so that whoever picks up a failed
   run two days later can still see what happened.
3. Unblock Kwame: the structured extraction must work on the current toolchain.
4. Write `docs/release-7.3-postmortem.md` explaining how a red run reported zero,
   and give a verdict on Rob's suggestion.
5. Do not modify `TidewaterUITests/SignInUITests.swift`.

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
  -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.5' \
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
- Generated: 2026-09-04T09:12:44Z

Signed off: @rob 2026-09-04 09:31
Signed off: @priya-qa 2026-09-04 09:44

=============== FILE: reports/raw-tail-7.3.txt ===============
tail of the console output captured by the runner for the same 7.3 job

Test Case '-[SignInUITests testSignInWithValidCredentials]' passed (11.402 seconds).
Test Case '-[SignInUITests testSignInRejectsWrongPassword]' passed (10.118 seconds).
Test Case '-[AccountUITests testResetPasswordSendsEmail]' started.
    t =    14.21s Assertion Failure: AccountUITests.swift:38: XCTAssertTrue failed
Test Case '-[AccountUITests testResetPasswordSendsEmail]' failed (16.884 seconds).
Test Case '-[AccountUITests testSignOutClearsSession]' started.
    t =     9.77s Assertion Failure: AccountUITests.swift:52: XCTAssertEqual failed:
                  ("Signed in as priya@tidewater.example") is not equal to ("Signed out")
Test Case '-[AccountUITests testSignOutClearsSession]' failed (12.309 seconds).

Test Suite 'All tests' failed at 2026-09-04 09:12:41.883.
     Executed 18 tests, with 2 failures (0 unexpected) in 201.774 seconds

** TEST FAILED **

=============== FILE: reports/kwame-terminal-2026-09-08.txt ===============
$ sw_vers -productVersion
15.5
$ xcodebuild -version
Xcode 16.2
Build version 16C5032a

$ # verify-release.sh does not produce one of these, so I made this bundle by
$ # hand from a local run to see what is inside it
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
