import XCTest

final class OnboardingUITests: XCTestCase {

    func testWaitlistSignUpShowsConfirmation() {
        let app = XCUIApplication()
        app.launch()
        app.buttons["Join the waitlist"].tap()
        app.textFields["email"].typeText("ada@example.com")
        app.buttons["Submit"].tap()
        XCTAssertTrue(app.staticTexts["You're on the list"].waitForExistence(timeout: 5))
    }

    func testOnboardingCanBeSkipped() {
        let app = XCUIApplication()
        app.launch()
        app.buttons["Skip"].tap()
        XCTAssertTrue(app.otherElements["home-screen"].exists)
    }
}
