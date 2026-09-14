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
