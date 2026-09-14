# Our Mac app tests hang on the rack mini every night and pass when Marek watches them

## Problem Description

Ledgerwood is a SwiftUI accounting app for the Mac. We have had UI tests for the
iPad app for two years and they are fine. Six weeks ago Marek copied the same
setup across for the desktop build, pointed it at the Mac mini in the rack, and
since then we have had a nightly job that has never once produced a result.

Where it stands as of this morning:

- The 02:00 job is a launchd item on the mini. It runs as root with nobody
  logged in — the mini has no monitor, it sits in the rack with a network cable.
  The first weeks it exited in about nine seconds with a destination error.
  Marek edited the destination by hand on the box on 2026-09-10 and re-ran it,
  and now it gets as far as launching the app and then nothing happens at all
  until our 60-minute timeout kills it. The log stops mid-line.
- When Marek screen-shares into the mini and runs the same command as himself,
  it gets further and stops at a macOS permission dialog. He added a handler for
  system alerts to the export test and it has never fired once. His plan for
  this week is to move that handler into `setUpWithError` and click somewhere in
  the app window first so it has something to trigger on. I would like a view on
  that before he spends the week on it.
- `testDashboardScrollPerformance` fails every time on the mini at roughly +43%
  against the stored baseline. The baseline was recorded in November 2024 on the
  Intel iMac that used to be the build machine. The mini is an M2. Nobody has
  changed the scrolling code in that window since March and the app does not
  feel slower on the mini.

Two more things finance has asked for on top:

- The dashboard has a chart drawn with Metal. They want a test that asserts
  three series are plotted on it after a ledger with three accounts is loaded.
- They want a test that drags a CSV out of a Finder window and drops it on the
  Ledgerwood window, because that is how our accountants import a statement and
  it broke twice last quarter.

Tell me what it takes to get a green run out of that mini at 02:00, and be
straight with me about anything on this list that is not going to work the way
it has been asked for. I would rather hear it now than in November.

## Output Specification

1. Rewrite `scripts/ci-ui-tests.sh` so the tests run against the desktop build.
2. Amend or replace `ci/com.ledgerwood.uitests.plist`, and say plainly what has
   to change about the 02:00 arrangement on that machine.
3. Edit `LedgerwoodUITests/DashboardUITests.swift` for the permission stop, and
   give your verdict on Marek's plan for it.
4. Write `docs/mac-ui-tests.md` covering the performance baseline and both of
   finance's requests.

## Input Files

Extract the following files before beginning.

=============== FILE: scripts/ci-ui-tests.sh ===============
#!/bin/bash
# copied from the iPad repo 2026-08-01 and pointed at the desktop scheme
set -e

xcodebuild test \
  -project Ledgerwood.xcodeproj \
  -scheme Ledgerwood \
  -destination 'platform=iOS Simulator,name=iPad Pro (11-inch),OS=latest' \
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
        let rows = app.tables["ledger-table"].tableRows
        XCTAssertTrue(app.staticTexts["filter-chip-4100"].waitForExistence(timeout: 5))
        XCTAssertEqual(rows.count, 12)
    }

    func testExportsLedgerToCSV() {
        // @marek 2026-08-29: has never fired on the rack mini
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

=============== FILE: reports/rack-run-2026-09-10.log ===============
=== com.ledgerwood.uitests, 2026-09-10 02:00:01 -0700 ===
launchd: loading com.ledgerwood.uitests (LaunchDaemon, uid 0, no GUI session attached)
+ xcodebuild test -project Ledgerwood.xcodeproj -scheme Ledgerwood -destination 'platform=iOS Simulator,name=iPad Pro (11-inch),OS=latest'
xcodebuild: error: Unable to find a destination matching the provided destination specifier:
        { platform:iOS Simulator, OS:latest, name:iPad Pro (11-inch) }
        Ineligible destinations for the "Ledgerwood" scheme:
                { platform:macOS, arch:arm64, id:00008112-000C4DEA0C50401E }
exit 70 after 8.9s

=== manual re-run by @marek, same daemon, destination edited on the box ===
=== 2026-09-10 14:22:10 -0700, nobody logged in at the console ===
Test Suite 'DashboardUITests' started at 2026-09-10 14:22:31.004
Test Case '-[DashboardUITests testOpensLedgerWindow]' started.
    t =     0.00s Open com.ledgerwood.Ledgerwood
    t =     0.41s     Launch com.ledgerwood.Ledgerwood
<no further output>
*** job killed by CI timeout after 60m00s ***

=============== FILE: reports/desk-run-2026-09-10.log ===============
=== @marek, screen-shared into the mini, logged in as ci-runner, run by hand ===
Test Case '-[DashboardUITests testOpensLedgerWindow]' passed (7.115 seconds).
Test Case '-[DashboardUITests testFiltersByAccount]' passed (9.402 seconds).

Test Case '-[DashboardUITests testExportsLedgerToCSV]' started.
    t =     6.02s Click "File" MenuBarItem
    t =     7.88s Click "export-ledger" MenuItem
    (a system dialog is on screen: "Ledgerwood.app wants access to control
     System Events.app. Allowing control will provide access to documents and
     data in System Events.app, and to perform actions within that app."
     Buttons: Don't Allow / OK. The interruption handler did not run.)
    t =    38.01s Assertion Failure: Failed to get matching snapshot:
                  No matches found for Button "export-confirm"
Test Case '-[DashboardUITests testExportsLedgerToCSV]' failed (38.440 seconds).

Test Case '-[DashboardUITests testDashboardScrollPerformance]' started.
    measured [Clock Monotonic Time, s] average: 0.254, relative standard deviation: 3.1%
    Assertion Failure: Time average is 42.7% worse (max allowed: 10.000%).
    Baseline for 'testDashboardScrollPerformance()' recorded 2024-11-03,
    average 0.178 s.
Test Case '-[DashboardUITests testDashboardScrollPerformance]' failed (11.204 seconds).

Executed 4 tests, with 2 failures (0 unexpected) in 66.161 seconds

Note from @marek: the same scroll measures 0.176-0.181 on my Intel MacBook Pro
on the same commit, which is where the stored baseline came from. The permission
dialog appears on the first run after a reinstall and again whenever the CI user
is reset; if I click OK by hand the export test passes.
