import XCTest

final class TransferUITests: XCTestCase {

    let app = XCUIApplication()

    override func setUpWithError() throws {
        app.launchArguments = ["-resetAccounts", "-seedBalance", "120450"]
        app.launch()
    }

    func testOpensTransferFromSummary() {
        app.buttons["open_transfer_button"].tap()
        XCTAssertTrue(app.otherElements["transfer-screen"].waitForExistence(timeout: 5))
    }

    func testBalanceIsShownOnSummary() {
        XCTAssertTrue(app.staticTexts["balance_label"].waitForExistence(timeout: 5))
    }

    func testSendsATransfer() {
        app.buttons["open_transfer_button"].tap()
        app.textFields["amount_field"].tap()
        app.textFields["amount_field"].typeText("25.00")
        app.buttons["Pay"].tap()
        let banner = app.staticTexts["confirmation_banner"]
        XCTAssertTrue(banner.waitForExistence(timeout: 10))
    }

    func testPickRecipientBeforePaying() {
        app.buttons["open_transfer_button"].tap()
        app.buttons["Choose recipient"].tap()
        XCTAssertTrue(app.tables["recipient-list"].waitForExistence(timeout: 5))
    }

    func testRejectsTransferOverBalance() {
        app.buttons["open_transfer_button"].tap()
        app.textFields["amount_field"].tap()
        app.textFields["amount_field"].typeText("99999.00")
        app.buttons["Pay"].tap()
        let error = app.staticTexts["insufficient_funds_label"]
        XCTAssertTrue(error.waitForExistence(timeout: 5))
        XCTAssertEqual(error.label, "insufficient_funds_label")
    }

    func testCancelReturnsToSummary() {
        app.buttons["open_transfer_button"].tap()
        app.navigationBars.buttons["Cancel"].tap()
        XCTAssertTrue(app.staticTexts["balance_label"].waitForExistence(timeout: 5))
    }
}
