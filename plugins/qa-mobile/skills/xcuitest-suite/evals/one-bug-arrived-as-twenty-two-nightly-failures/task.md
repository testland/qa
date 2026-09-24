# One backend change turned up as 22 of last night's 23 failures

## Problem Description

Cobalt Health, iOS app, nightly job on our GitHub runners.

The 2026-09-09 nightly came back with 23 failures. Nadia spent Wednesday on it
and got as far as "this is one backend change on the appointments list, it is not
twenty-two bugs", then went on leave until Monday. What she left behind is the
nightly output, the appointments view controller as it stands after the
2026-09-08 deploy, and a note that the list now makes two round trips where it
used to make one.

The twenty-third is separate and I want it dealt with in the same pass.
`testDateOfBirthAcceptsLeapDay` has failed on the runner every night since
2026-09-05 and Nadia could not make it fail on her laptop. The only thing that
changed on 2026-09-05 was the runner image; its changelog is attached. She had no
way to put her machine into the state the runner is in, and we could not look at
the run record from any of the failing nights because the job only keeps it when
the job goes green.

What I want out of this is that one bug arrives as one failure. What I do not
want is to go back to the old behaviour where the run stopped dead at the first
red test and we found the next problem the following night — we changed that
deliberately in April and I am not undoing it. If a test breaks, I still want to
know about every other test in that run on the same morning.

Sanjay has two asks on top:

- Failures should be rerun automatically before the on-call is paged, since in
  his words "a tap that misses once will hit on the second go".
- The run record should be kept on red nights as well as green ones, because
  nobody could see what the screen looked like when any of those 23 failed.

Give me a straight view on both of those.

## Output Specification

1. Edit `CobaltUITests/AppointmentsUITests.swift` so that a broken step reports
   what broke instead of a page of consequences, and so the three appointment
   tests are no longer at the mercy of how long the list takes to arrive. Do not
   delete a test and do not remove an assertion.
2. Edit `.github/workflows/ios-nightly.yml` so that a failing night is
   reproducible on a developer machine and leaves behind what is needed to
   diagnose it.
3. Write `docs/nightly-answer.md` covering: why 23 became the number it did, what
   I actually get on the morning after your change, and a verdict on each of
   Sanjay's two asks.

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

    func testAppointmentsHeaderShowsPatient() {
        app.buttons["appointments-tab"].tap()
        let header = app.staticTexts["appointments-header"]
        XCTAssertTrue(header.waitForExistence(timeout: 10))
        XCTAssertEqual(header.label, "Mensah, Adwoa")
    }

    func testBooksFollowUpFromAppointmentsList() {
        app.buttons["appointments-tab"].tap()
        app.cells["appointment-row-0"].tap()
        app.buttons["book-follow-up"].tap()
        app.buttons["slot-2026-09-15-0930"].tap()
        app.buttons["confirm-booking"].tap()
        XCTAssertTrue(app.staticTexts["booking-confirmed"].exists)
        XCTAssertEqual(app.staticTexts["booking-reference"].label, "APT-77341")
        XCTAssertEqual(app.staticTexts["booking-slot"].label, "15 Sep 2026, 09:30")
        XCTAssertTrue(app.buttons["add-to-calendar"].isEnabled)
    }

    func testCancelsAnAppointment() {
        app.buttons["appointments-tab"].tap()
        app.cells["appointment-row-0"].swipeLeft()
        app.buttons["row-cancel"].tap()
        app.buttons["cancel-confirm"].tap()
        XCTAssertTrue(app.staticTexts["cancelled-banner"].exists)
        XCTAssertEqual(app.staticTexts["cancelled-banner"].label, "Appointment cancelled")
        XCTAssertTrue(app.buttons["undo-cancel"].isEnabled)
        XCTAssertEqual(app.staticTexts["appointments-count"].label, "2 upcoming")
    }

    func testDateOfBirthAcceptsLeapDay() {
        app.buttons["patient-details-tab"].tap()
        app.buttons["edit-dob"].tap()
        app.datePickers.pickerWheels.element(boundBy: 0).adjust(toPickerWheelValue: "February")
        app.datePickers.pickerWheels.element(boundBy: 1).adjust(toPickerWheelValue: "29")
        app.buttons["save-dob"].tap()
        XCTAssertEqual(app.staticTexts["dob-value"].label, "29 Feb 2004")
    }

    func testFiltersAppointmentsByClinician() {
        app.buttons["appointments-tab"].tap()
        app.cells["appointment-row-0"].tap()
        app.buttons["row-clinician"].tap()
        app.buttons["filter-to-this-clinician"].tap()
        XCTAssertEqual(app.tables["appointments-list"].cells.count, 2)
        XCTAssertTrue(app.staticTexts["filter-chip"].exists)
        XCTAssertEqual(app.staticTexts["filter-chip"].label, "Dr Ferrar")
        XCTAssertTrue(app.buttons["clear-filter"].isEnabled)
    }

    func testOpensPatientRecord() {
        app.buttons["patient-details-tab"].tap()
        let name = app.staticTexts["patient-name"]
        XCTAssertTrue(name.waitForExistence(timeout: 10))
        XCTAssertEqual(name.label, "Mensah, Adwoa")
    }
}

=============== FILE: Cobalt/Appointments/AppointmentsViewController.swift ===============
import UIKit

final class AppointmentsViewController: UITableViewController {

    private enum State {
        case loading
        case loaded([Appointment])
    }

    private var state: State = .loading

    override func viewDidLoad() {
        super.viewDidLoad()
        tableView.accessibilityIdentifier = "appointments-list"
        reload()
    }

    // 2026-09-08 @tobi: page 1 and the unread-count endpoint are two calls now.
    private func reload() {
        state = .loading
        tableView.reloadData()
        ClinicalAPI.shared.appointments(page: 1) { [weak self] page in
            ClinicalAPI.shared.unreadCount { [weak self] _ in
                self?.state = .loaded(page.items)
                self?.tableView.reloadData()
            }
        }
    }

    override func tableView(_ table: UITableView, numberOfRowsInSection section: Int) -> Int {
        switch state {
        case .loading:            return 6
        case .loaded(let items):  return items.count
        }
    }

    override func tableView(_ table: UITableView, cellForRowAt path: IndexPath) -> UITableViewCell {
        let cell = table.dequeueReusableCell(withIdentifier: "appointment", for: path)
        cell.accessibilityIdentifier = "appointment-row-\(path.row)"

        switch state {
        case .loading:
            cell.textLabel?.text = nil
            cell.detailTextLabel?.text = nil
            cell.accessoryView = ShimmerView(frame: cell.contentView.bounds)
            cell.isUserInteractionEnabled = false

        case .loaded(let items):
            let item = items[path.row]
            cell.textLabel?.text = item.summary
            cell.detailTextLabel?.text = item.clinicianName
            cell.accessoryView = nil
            cell.isUserInteractionEnabled = true
        }
        return cell
    }

    override func tableView(_ table: UITableView, didSelectRowAt path: IndexPath) {
        guard case .loaded(let items) = state else { return }
        show(AppointmentDetailViewController(items[path.row]), sender: self)
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

Test Case '-[AppointmentsUITests testAppointmentsHeaderShowsPatient]' started.
Test Case '-[AppointmentsUITests testAppointmentsHeaderShowsPatient]' passed (18.442 seconds).

Test Case '-[AppointmentsUITests testBooksFollowUpFromAppointmentsList]' started.
    t =     1.94s Tap "appointments-tab" Button
    t =     2.61s Tap Cell "appointment-row-0"
    AppointmentsUITests.swift:24: error: No matches found for Button "book-follow-up"
    AppointmentsUITests.swift:25: error: No matches found for Button "slot-2026-09-15-0930"
    AppointmentsUITests.swift:26: error: No matches found for Button "confirm-booking"
    AppointmentsUITests.swift:27: error: XCTAssertTrue failed
    AppointmentsUITests.swift:28: error: XCTAssertEqual failed: ("") is not equal to ("APT-77341")
    AppointmentsUITests.swift:29: error: XCTAssertEqual failed: ("") is not equal to ("15 Sep 2026, 09:30")
    AppointmentsUITests.swift:30: error: XCTAssertTrue failed
    AppointmentsUITests.swift:30: error: Failed to get isEnabled for element that does not exist
Test Case '-[AppointmentsUITests testBooksFollowUpFromAppointmentsList]' failed (52.118 seconds).

Test Case '-[AppointmentsUITests testCancelsAnAppointment]' started.
    t =     1.88s Tap "appointments-tab" Button
    t =     2.44s Swipe left Cell "appointment-row-0"
    AppointmentsUITests.swift:36: error: No matches found for Button "row-cancel"
    AppointmentsUITests.swift:37: error: No matches found for Button "cancel-confirm"
    AppointmentsUITests.swift:38: error: XCTAssertTrue failed
    AppointmentsUITests.swift:39: error: XCTAssertEqual failed: ("") is not equal to ("Appointment cancelled")
    AppointmentsUITests.swift:40: error: XCTAssertTrue failed
    AppointmentsUITests.swift:40: error: Failed to get isEnabled for element that does not exist
    AppointmentsUITests.swift:41: error: XCTAssertEqual failed: ("3 upcoming") is not equal to ("2 upcoming")
Test Case '-[AppointmentsUITests testCancelsAnAppointment]' failed (48.902 seconds).

Test Case '-[AppointmentsUITests testDateOfBirthAcceptsLeapDay]' started.
    AppointmentsUITests.swift:47: error: No matches found for Element type PickerWheel
Test Case '-[AppointmentsUITests testDateOfBirthAcceptsLeapDay]' failed (24.310 seconds).

Test Case '-[AppointmentsUITests testFiltersAppointmentsByClinician]' started.
    t =     1.91s Tap "appointments-tab" Button
    t =     2.55s Tap Cell "appointment-row-0"
    AppointmentsUITests.swift:56: error: No matches found for Button "row-clinician"
    AppointmentsUITests.swift:57: error: No matches found for Button "filter-to-this-clinician"
    AppointmentsUITests.swift:58: error: XCTAssertEqual failed: ("3") is not equal to ("2")
    AppointmentsUITests.swift:59: error: XCTAssertTrue failed
    AppointmentsUITests.swift:60: error: XCTAssertEqual failed: ("") is not equal to ("Dr Ferrar")
    AppointmentsUITests.swift:61: error: XCTAssertTrue failed
    AppointmentsUITests.swift:61: error: Failed to get isEnabled for element that does not exist
Test Case '-[AppointmentsUITests testFiltersAppointmentsByClinician]' failed (61.774 seconds).

Test Case '-[AppointmentsUITests testOpensPatientRecord]' started.
Test Case '-[AppointmentsUITests testOpensPatientRecord]' passed (17.220 seconds).

Executed 6 tests, with 23 failures (0 unexpected) in 224.208 seconds

=============== FILE: reports/nadia-handover-2026-09-10.md ===============
# Handover - nightly #612

Seed patient P-88120 has three upcoming appointments, all with Dr Ferrar except
one. `-stubClinicalApi` serves them from the local stub.

The appointments tab used to call one endpoint. Since the 2026-09-08 deploy it
calls page 1 and then the unread-count endpoint before it publishes anything.
Measured against the stub on my laptop: 420 ms and 610 ms across ten runs.
Longer on the runner - I have seen 900 ms on a cold job.

The data itself is fine. Every row is correct once the tab has settled, and I can
drive all three of these tests by hand on the simulator without a single miss.

Nothing else shipped on 2026-09-08.

=============== FILE: reports/runner-image-20260905.md ===============
# macos-15 runner image 20260905.1 - changes from 20260822.3

- Xcode 16.2 (16C5032a) remains the selected version; 16.1 removed.
- Pre-installed simulator runtimes: iOS 18.0 (was 17.5), watchOS 11.0.
- Homebrew 4.4.2, node 22.9.0, ruby 3.3.5.
- Removed: iOS 17.5 simulator runtime, tvOS 17.4 simulator runtime.
- CocoaPods 1.15.2.

=============== FILE: reports/sanjay-thread.md ===============
@sanjay, #ios-quality, 2026-09-10

> Two things and then I will stop. One, every one of those 23 is a tap that did
> not land. A tap that misses once will hit on the second go - let the runner try
> the failures again before it wakes anyone up, and the on-call page stops being
> a 6am lottery. Two, whatever else we do, keep the bundle on red nights. Nadia
> spent a day on #612 without a single screenshot of what the screen actually
> looked like, which is a day nobody should have had to spend.
