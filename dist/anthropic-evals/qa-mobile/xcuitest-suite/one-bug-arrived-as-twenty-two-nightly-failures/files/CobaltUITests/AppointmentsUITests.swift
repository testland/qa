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
