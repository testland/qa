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
