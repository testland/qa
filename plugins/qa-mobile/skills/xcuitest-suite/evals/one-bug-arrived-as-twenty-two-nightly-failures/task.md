# One backend change turned up as 22 of last night's 23 failures

## Problem Description

Cobalt Health, iOS app, nightly device job on our GitHub runners.

The 2026-09-09 nightly came back with 23 failures. Nadia spent the whole of
Wednesday on it and the write-up is one sentence: the appointments list started
doing a second round-trip for pagination on 2026-09-08, so the list is empty for
roughly half a second after the tab opens, and the first tap in three of the
tests lands on nothing. One change. Twenty-two of the twenty-three failures came
out of it.

The twenty-third is separate and I want it dealt with in the same pass. The
`testDateOfBirthAcceptsLeapDay` test has failed on the runner every night since
2026-09-05 and Nadia cannot make it fail on her machine. The only thing that
changed on 2026-09-05 was the runner image; the release notes for it say the
pre-installed simulator runtime went from 17.5 to 18.0. She has no way to get her
laptop into the state the runner is in, and we could not look at the run record
from the failing night because the job only keeps it when the job goes green.

What I want out of this is that one bug arrives as one failure. What I do not
want is to go back to the old behaviour where the run stopped dead at the first
red test and we found the next problem the following night — we changed that
deliberately in April and I am not undoing it. If a test breaks, I still want to
know about every other test in that run on the same morning.

Sanjay also wants failures rerun automatically before the on-call is paged,
since in his words "a tap that misses once will hit on the second go". Give me a
straight view on that too.

Attached: the test class, the workflow, and the nightly output.

## Output Specification

1. Edit `CobaltUITests/AppointmentsUITests.swift` so that the late-loading list
   produces one failure in one test rather than a cascade, and so the tests stop
   tapping rows that are not on screen yet. Do not delete a test and do not
   remove an assertion.
2. Edit `.github/workflows/ios-nightly.yml` so that a failing night is
   reproducible on a developer machine and leaves behind what is needed to
   diagnose it.
3. Write `docs/nightly-answer.md` covering: why 23 became the number it did, what
   I actually get on the morning after your change, and a verdict on Sanjay's
   reruns.

## Input Files

Extract the following files before beginning.

=============== FILE: CobaltUITests/AppointmentsUITests.swift ===============
import XCTest

final class AppointmentsUITests: XCTestCase {

    let app = XCUIApplication()

    override func setUpWithError() throws {
        // 2026-04-02 @sanjay: report every failure in the run, not just the first
        continueAfterFailure = true
        app.launchArguments = ["-seedPatient", "P-88120", "-stubClinicalApi"]
        app.launch()
    }

    func testBooksFollowUpFromAppointmentsList() {
        app.buttons["appointments-tab"].tap()
        app.cells["appointment-row-0"].tap()
        app.buttons["book-follow-up"].tap()
        app.buttons["slot-2026-09-15-0930"].tap()
        app.buttons["confirm-booking"].tap()
        XCTAssertTrue(app.staticTexts["booking-confirmed"].exists)
        XCTAssertEqual(app.staticTexts["booking-reference"].label, "APT-77341")
        XCTAssertTrue(app.buttons["add-to-calendar"].isEnabled)
    }

    func testCancelsAnAppointment() {
        app.buttons["appointments-tab"].tap()
        app.cells["appointment-row-0"].swipeLeft()
        app.buttons["row-cancel"].tap()
        app.buttons["cancel-confirm"].tap()
        XCTAssertTrue(app.staticTexts["cancelled-banner"].exists)
        XCTAssertEqual(app.staticTexts["cancelled-banner"].label, "Appointment cancelled")
        XCTAssertFalse(app.cells["appointment-row-0"].exists)
    }

    func testFiltersAppointmentsByClinician() {
        app.buttons["appointments-tab"].tap()
        app.buttons["filter-clinician"].tap()
        app.cells["clinician-option-dr-ferrar"].tap()
        app.buttons["apply-filter"].tap()
        XCTAssertEqual(app.cells.matching(identifier: "appointment-row").count, 2)
        XCTAssertTrue(app.staticTexts["filter-chip-dr-ferrar"].exists)
    }

    func testDateOfBirthAcceptsLeapDay() {
        app.buttons["patient-details-tab"].tap()
        app.buttons["edit-dob"].tap()
        app.datePickers.pickerWheels.element(boundBy: 0).adjust(toPickerWheelValue: "February")
        app.datePickers.pickerWheels.element(boundBy: 1).adjust(toPickerWheelValue: "29")
        app.buttons["save-dob"].tap()
        XCTAssertEqual(app.staticTexts["dob-value"].label, "29 Feb 2004")
    }

    func testEmptyStateForNewPatient() {
        app.buttons["appointments-tab"].tap()
        let empty = app.staticTexts["appointments-empty"]
        XCTAssertTrue(empty.waitForExistence(timeout: 10))
        XCTAssertEqual(empty.label, "No upcoming appointments")
    }

    func testOpensPatientRecord() {
        app.buttons["patient-details-tab"].tap()
        let name = app.staticTexts["patient-name"]
        XCTAssertTrue(name.waitForExistence(timeout: 10))
        XCTAssertEqual(name.label, "Mensah, Adwoa")
    }
}

=============== FILE: .github/workflows/ios-nightly.yml ===============
name: ios-nightly

on:
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  ui-tests:
    runs-on: macos-15
    timeout-minutes: 90
    steps:
      - uses: actions/checkout@v5

      - name: Run UI tests
        run: |
          xcodebuild test \
            -project Cobalt.xcodeproj \
            -scheme Cobalt \
            -destination 'platform=iOS Simulator,name=iPhone 15,OS=latest' \
            -resultBundlePath TestResults.xcresult

      - name: Upload result bundle
        if: success()
        uses: actions/upload-artifact@v4
        with:
          name: xcresult
          path: TestResults.xcresult

      - name: Clean workspace
        run: rm -rf TestResults.xcresult DerivedData

=============== FILE: reports/nightly-2026-09-09.txt ===============
ios-nightly #612, runner image macos-15 20260905.1, started 2026-09-09 02:00:41 UTC

Test Case '-[AppointmentsUITests testBooksFollowUpFromAppointmentsList]' started.
  AppointmentsUITests.swift:20: error: No matches found for Cell "appointment-row-0"
  AppointmentsUITests.swift:21: error: No matches found for Button "book-follow-up"
  AppointmentsUITests.swift:22: error: No matches found for Button "slot-2026-09-15-0930"
  AppointmentsUITests.swift:23: error: No matches found for Button "confirm-booking"
  AppointmentsUITests.swift:24: error: XCTAssertTrue failed
  AppointmentsUITests.swift:25: error: XCTAssertEqual failed: ("") is not equal to ("APT-77341")
  AppointmentsUITests.swift:26: error: XCTAssertTrue failed
  AppointmentsUITests.swift:26: error: Failed to get isEnabled for element that does not exist
Test Case '-[AppointmentsUITests testBooksFollowUpFromAppointmentsList]' failed (52.118 seconds).

Test Case '-[AppointmentsUITests testCancelsAnAppointment]' started.
  AppointmentsUITests.swift:31: error: No matches found for Cell "appointment-row-0"
  AppointmentsUITests.swift:32: error: No matches found for Button "row-cancel"
  AppointmentsUITests.swift:33: error: No matches found for Button "cancel-confirm"
  AppointmentsUITests.swift:34: error: XCTAssertTrue failed
  AppointmentsUITests.swift:35: error: XCTAssertEqual failed: ("") is not equal to ("Appointment cancelled")
  AppointmentsUITests.swift:36: error: XCTAssertFalse failed
  AppointmentsUITests.swift:36: error: element query returned no results
Test Case '-[AppointmentsUITests testCancelsAnAppointment]' failed (48.902 seconds).

Test Case '-[AppointmentsUITests testFiltersAppointmentsByClinician]' started.
  AppointmentsUITests.swift:41: error: No matches found for Button "filter-clinician"
  AppointmentsUITests.swift:42: error: No matches found for Cell "clinician-option-dr-ferrar"
  AppointmentsUITests.swift:43: error: No matches found for Button "apply-filter"
  AppointmentsUITests.swift:44: error: XCTAssertEqual failed: ("0") is not equal to ("2")
  AppointmentsUITests.swift:45: error: XCTAssertTrue failed
  AppointmentsUITests.swift:45: error: No matches found for StaticText "filter-chip-dr-ferrar"
  AppointmentsUITests.swift:45: error: snapshot request timed out after 3 retries
Test Case '-[AppointmentsUITests testFiltersAppointmentsByClinician]' failed (61.774 seconds).

Test Case '-[AppointmentsUITests testDateOfBirthAcceptsLeapDay]' started.
  AppointmentsUITests.swift:50: error: No matches found for Element type PickerWheel
Test Case '-[AppointmentsUITests testDateOfBirthAcceptsLeapDay]' failed (24.310 seconds).

Test Case '-[AppointmentsUITests testEmptyStateForNewPatient]' passed (19.884 seconds).
Test Case '-[AppointmentsUITests testOpensPatientRecord]' passed (17.220 seconds).

Executed 6 tests, with 23 failures (0 unexpected) in 224.208 seconds

Note from @nadia 2026-09-10: the appointments tab now fetches page 1 and then a
count endpoint before it renders any row - measured 420-610 ms on the stub API,
longer on the runner. Rows are correct once they arrive; nothing else changed.
`testDateOfBirthAcceptsLeapDay` has failed on the runner every night since the
2026-09-05 image, passes on my machine on 17.5, and I have no run record from
any of the failing nights to look at.
