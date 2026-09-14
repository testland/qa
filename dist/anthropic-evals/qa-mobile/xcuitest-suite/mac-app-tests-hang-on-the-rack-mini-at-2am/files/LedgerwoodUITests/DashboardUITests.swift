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
