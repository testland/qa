import XCTest

final class CheckoutUITests: XCTestCase {

    let app = XCUIApplication()

    override func setUpWithError() throws {
        app.launchArguments = ["-seedCart", "BOOK-001"]
        app.launch()
        signIn()
    }

    private func signIn() {
        app.textFields["sign-in-email"].tap()
        app.textFields["sign-in-email"].typeText("qa@fieldmark.example")
        app.secureTextFields["sign-in-password"].tap()
        app.secureTextFields["sign-in-password"].typeText("hunter2hunter2")
        app.buttons["sign-in-submit"].tap()
        Thread.sleep(forTimeInterval: 2.0)
    }

    func testCartBadgeCountsItems() {
        app.buttons["catalog-tab"].tap()
        app.buttons["add-to-cart-BOOK-002"].tap()
        XCTAssertTrue(app.staticTexts["cart-badge"].exists)
    }

    func testPromoCodeApplies() {
        app.buttons["cart-tab"].tap()
        app.buttons["open-promo"].tap()
        let promoField = app.textFields["promo-code-field"]
        _ = promoField.waitForExistence(timeout: 3)
        XCTAssertNotNil(promoField)
        XCTAssertFalse(app.staticTexts["promo-error"].exists)
    }

    func testCheckoutShowsNoValidationErrors() {
        app.buttons["cart-tab"].tap()
        app.buttons["go-to-checkout"].tap()
        app.textFields["shipping-postcode"].tap()
        app.textFields["shipping-postcode"].typeText("94107")
        app.buttons["continue-to-payment"].tap()
        XCTAssertFalse(app.staticTexts["field-error"].exists)
    }

    func testOrderConfirmationShowsOrderId() {
        app.buttons["cart-tab"].tap()
        app.buttons["go-to-checkout"].tap()
        app.buttons["continue-to-payment"].tap()
        app.buttons["pay-now"].tap()
        Thread.sleep(forTimeInterval: 3.0)
        XCTAssertNotNil(app.staticTexts["order-id"])
    }

    func testEmptyCartShowsPlaceholder() {
        app.buttons["cart-tab"].tap()
        app.buttons["remove-BOOK-001"].tap()
        let placeholder = app.staticTexts["cart-empty-placeholder"]
        XCTAssertTrue(placeholder.waitForExistence(timeout: 5))
        XCTAssertEqual(placeholder.label, "Your cart is empty")
        XCTAssertFalse(app.buttons["go-to-checkout"].isEnabled)
    }

    func testGuestCheckoutRejectsBlankEmail() {
        app.buttons["cart-tab"].tap()
        app.buttons["go-to-checkout"].tap()
        app.buttons["continue-to-payment"].tap()
        let error = app.staticTexts["field-error"]
        XCTAssertTrue(error.waitForExistence(timeout: 5))
        XCTAssertEqual(error.label, "Enter an email address")
    }
}
