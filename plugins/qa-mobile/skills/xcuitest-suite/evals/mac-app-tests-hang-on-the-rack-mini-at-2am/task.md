# Our Mac app tests hang on the rack mini every night and pass when Marek watches them

## Problem Description

Ledgerwood is a SwiftUI accounting app for the Mac. We have had UI tests on the
iPad app for two years and they are fine. Six weeks ago Marek copied the setup
across for the desktop build, pointed it at the Mac mini in the rack, and since
then the nightly job has never once produced a result.

Where it stands this morning:

- The 02:00 job is a launchd item on the mini, installed in
  `/Library/LaunchDaemons`. The mini has no monitor and no keyboard; it sits in
  the rack with a power cable and a network cable, and nobody is logged in at it.
  The destination argument was wrong for the first fortnight and Marek fixed that
  on 2026-09-10. Since then the job gets as far as launching the app and then
  produces no further output until the CI timeout kills it. We raised the timeout
  from 60 to 180 minutes on 2026-09-12 and it made no difference — it just sits
  there for three hours instead of one. Marek's plan for Monday is to wrap the
  invocation in `launchctl asuser` with `caffeinate -dimsu` so the box does not
  idle, and he is fairly confident about it.
- When Marek screen-shares into the mini and runs the same command as himself, it
  gets much further. Two tests pass, and `testExportsLedgerToCSV` stops on a macOS
  dialog. He put a handler for system alerts into that test in August and it has
  never cleared one. His other plan for this week is to move that handler up into
  `setUpWithError` and click somewhere inside the app window straight afterwards
  so the handler has something to fire on. I would like a view on that before he
  spends the week on it.
- `testDashboardScrollPerformance` fails on the mini every time at roughly +43%.
  Nobody has touched the scrolling code since March, the app does not feel slower
  on the mini, and Xcode is offering to accept the new figure as the baseline.
  The stored baseline directory is attached.

Three things finance has asked for on top of all that:

- The dashboard has a chart drawn with Metal by the Nordwall charting framework
  we license as a binary. They want a test that asserts three series are plotted
  on it once a ledger with three accounts is loaded.
- They want a test that drags a CSV out of a Finder window and drops it on the
  Ledgerwood window, because that is how our accountants import a bank statement
  and it broke twice last quarter.
- They want the Monthly Close sheet covered. That one is ordinary SwiftUI —
  `monthly-close-sheet` on the sheet, `close-period` on the button, `close-total`
  on the label that should read the sum across the three seeded accounts
  (`$41,208.55`), and `close-confirmation` on the banner that appears after.

Tell me what it takes to get a green run out of that mini at 02:00, and be
straight with me about anything on this list that is not going to work the way it
has been asked for. I would rather hear it now than in November.

## Output Specification

1. Rewrite `scripts/ci-ui-tests.sh`.
2. Amend or replace `ci/com.ledgerwood.uitests.plist`, and say plainly what has to
   change about the 02:00 arrangement on that machine.
3. Edit `LedgerwoodUITests/DashboardUITests.swift` for the dialog that stops the
   export test, and give your verdict on Marek's plan for it. Add whatever of
   finance's three requests you are prepared to write.
4. Write `docs/mac-ui-tests.md` covering the performance failure and each of
   finance's three requests.

## Input Files

Extract the following files before beginning.

=============== FILE: scripts/ci-ui-tests.sh ===============
#!/bin/bash
# runs on the rack mini out of launchd at 02:00
set -e

cd /opt/ci/ledgerwood

# @marek 2026-09-11: give the box time to settle after the nightly reboot
sleep 120

rm -rf build
xcodebuild test \
  -project Ledgerwood.xcodeproj \
  -scheme Ledgerwood \
  -destination 'platform=macOS' \
  -resultBundlePath build/result.xcresult

=============== FILE: ci/com.ledgerwood.uitests.plist ===============
<?xml version="1.0" encoding="UTF-8"?>
<!-- installed at /Library/LaunchDaemons/com.ledgerwood.uitests.plist -->
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ledgerwood.uitests</string>
    <key>UserName</key>
    <string>root</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/opt/ci/ledgerwood/scripts/ci-ui-tests.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/var/log/ledgerwood-uitests.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/ledgerwood-uitests.err</string>
</dict>
</plist>

=============== FILE: LedgerwoodUITests/DashboardUITests.swift ===============
import XCTest

final class DashboardUITests: XCTestCase {

    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launchArguments = ["-seedLedger", "three-accounts"]
        app.launch()
    }

    func testOpensLedgerWindow() {
        XCTAssertTrue(app.windows["ledger-window"].waitForExistence(timeout: 10))
        XCTAssertEqual(app.staticTexts["ledger-title"].value as? String, "Q3 2026")
    }

    func testFiltersByAccount() {
        app.popUpButtons["account-filter"].click()
        app.menuItems["account-4100"].click()
        XCTAssertTrue(app.staticTexts["filter-chip-4100"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.tables["ledger-table"].tableRows.count, 12)
    }

    func testExportsLedgerToCSV() {
        // @marek 2026-08-29: has never cleared one on the rack mini
        let monitor = addUIInterruptionMonitor(withDescription: "system permission") { alert in
            alert.buttons["OK"].click()
            alert.buttons["Allow"].click()
            return true
        }
        addTeardownBlock { self.removeUIInterruptionMonitor(monitor) }

        app.menuBarItems["File"].click()
        app.menuItems["export-ledger"].click()
        app.buttons["export-confirm"].click()
        XCTAssertTrue(app.staticTexts["export-complete"].waitForExistence(timeout: 30))
    }

    func testDashboardScrollPerformance() {
        measure(metrics: [XCTClockMetric()]) {
            app.tables["ledger-table"].swipeUp()
        }
    }
}

=============== FILE: LedgerwoodUITests/PerformanceBaselines/DashboardUITests/Info.plist ===============
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>runDestinationsByUUID</key>
  <dict>
    <key>1B5C2C64-7F1E-4C1A-9E64-9E3F1D2A77B1</key>
    <dict>
      <key>localComputer</key>
      <dict>
        <key>cpuCount</key><integer>1</integer>
        <key>cpuKind</key><string>Intel Core i9</string>
        <key>cpuSpeedInMHz</key><integer>3600</integer>
        <key>logicalCPUCoresPerPackage</key><integer>16</integer>
        <key>modelCode</key><string>iMac19,1</string>
        <key>physicalCPUCoresPerPackage</key><integer>8</integer>
        <key>platformIdentifier</key><string>com.apple.platform.macosx</string>
      </dict>
      <key>targetArchitecture</key><string>x86_64</string>
    </dict>
  </dict>
  <key>classNames</key>
  <dict>
    <key>DashboardUITests</key>
    <dict>
      <key>testDashboardScrollPerformance()</key>
      <dict>
        <key>com.apple.XCTPerformanceMetric_WallClockTime</key>
        <dict>
          <key>1B5C2C64-7F1E-4C1A-9E64-9E3F1D2A77B1</key>
          <dict>
            <key>baselineAverage</key><real>0.178</real>
            <key>baselineIntegrationDisplayName</key><string>Local Baseline</string>
            <key>maxPercentRelativeStandardDeviation</key><real>10</real>
            <key>maxRegression</key><real>10</real>
          </dict>
        </dict>
      </dict>
    </dict>
  </dict>
</dict>
</plist>

=============== FILE: reports/rack-run-2026-09-13.log ===============
=== /var/log/ledgerwood-uitests.log, 2026-09-13 ===
2026-09-13 02:00:01 -0700 com.ledgerwood.uitests: started
+ cd /opt/ci/ledgerwood
+ sleep 120
+ rm -rf build
+ xcodebuild test -project Ledgerwood.xcodeproj -scheme Ledgerwood -destination 'platform=macOS' -resultBundlePath build/result.xcresult
Testing started
Test Suite 'All tests' started at 2026-09-13 02:02:39.118
Test Suite 'DashboardUITests' started at 2026-09-13 02:02:39.119
Test Case '-[DashboardUITests testDashboardScrollPerformance]' started.
    t =     0.00s Open com.ledgerwood.Ledgerwood
    t =     0.44s     Launch com.ledgerwood.Ledgerwood
<no further output>

*** job killed by CI timeout after 180m00s ***

=== /var/log/ledgerwood-uitests.err, same run ===
(empty)

=============== FILE: reports/desk-run-2026-09-13.log ===============
=== @marek, screen-shared into the mini over VNC, logged in as ci-runner,
=== run by hand from Terminal, 2026-09-13 14:22

Test Case '-[DashboardUITests testDashboardScrollPerformance]' started.
    measured [Clock Monotonic Time, s] average: 0.254, relative standard deviation: 3.1%
    Assertion Failure: Time average is 42.7% worse (max allowed: 10.000%).
    Baseline for 'testDashboardScrollPerformance()' average 0.178 s.
Test Case '-[DashboardUITests testDashboardScrollPerformance]' failed (11.204 seconds).

Test Case '-[DashboardUITests testExportsLedgerToCSV]' started.
    t =     6.02s Click "File" MenuBarItem
    t =     7.88s Click "export-ledger" MenuItem
    t =     8.10s Wait for com.ledgerwood.Ledgerwood to idle
    t =    38.01s Assertion Failure: Failed to get matching snapshot:
                  No matches found for Button "export-confirm"
Test Case '-[DashboardUITests testExportsLedgerToCSV]' failed (38.440 seconds).

Test Case '-[DashboardUITests testFiltersByAccount]' passed (9.402 seconds).
Test Case '-[DashboardUITests testOpensLedgerWindow]' passed (7.115 seconds).

Executed 4 tests, with 2 failures (0 unexpected) in 66.161 seconds

=============== FILE: reports/marek-notes-2026-09-13.md ===============
# What I see when I sit on the box

## The export test

A dialog appears on screen the moment the export menu item is clicked. It is not
one of ours - it is grey, it is centred on the display rather than on our window,
and it reads:

    "Ledgerwood.app" wants access to control "System Events.app". Allowing
    control will provide access to documents and data in "System Events.app",
    and to perform actions within that app.

    [ Don't Allow ]  [ OK ]

The test sits there until the 30-second wait gives up. If I click OK myself
before the wait expires, the export test passes and keeps passing until the box
is reimaged or the ci-runner account is reset, and then it comes back.

## The scroll measurement

0.252, 0.254, 0.256, 0.251, 0.254 across five runs on the mini. Tight. The mini
is an M2, bought in February. I do not know which machine recorded the baseline -
it predates me and it has been in the repo since 2024.

## The rack job

Nothing in the err log. Nothing in the result bundle either - the bundle is never
written, the directory is empty when I go looking in the morning.
