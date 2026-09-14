# Our checkout UI tests were green through an eleven-day outage on the screen they cover

## Problem Description

Fieldmark is an iOS retail app. `CheckoutUITests` has six tests and has been
green on every nightly run since April.

On 2026-09-09 support escalated INC-4471: the promo-code screen has been
returning a 500 from the pricing service since 2026-08-28. Customers have been
unable to apply a promo code for eleven days. Fourteen nightly runs went green
across that window, including `testPromoCodeApplies`, which is the test we point
at in the release checklist as the reason we do not manually check that screen.

Before escalating it to me, Dev on my team did the obvious experiment: he
stubbed the promo view controller so it never renders at all — the screen is
simply not there — and ran the class locally. Six passed, zero failed. He then
pulled the screenshot attachments out of the result bundle for the last nightly
and every attachment for the promo tests shows the cart screen. The promo screen
does not appear in any of them.

So I no longer trust any of the six. I want to know, test by test, which of them
could actually have gone red for the behaviour named in its own method name, and
which of them cannot fail no matter what the app does.

Priya reads it as a slow-simulator problem — the CI box is a shared mac mini
running two jobs — and thinks a couple of seconds of settling time after each tap
would sort the whole thing out. She has a branch that adds exactly that and it is
green. I would like a second opinion on that branch before I take it, because
"green" is the exact property that got us here.

The accessibility identifiers in the app are fine as far as I know — they were
added properly when the screens were built, and I have attached the view
controller so you can see what is set on each element and when each one renders.

## Output Specification

1. Rewrite `FieldmarkUITests/CheckoutUITests.swift` so that every test fails when
   the behaviour named in its method name is broken. Do not delete a test, do not
   rename one, and do not weaken or remove an assertion that is already doing
   real work.
2. Do not change `Fieldmark/Checkout/CheckoutViewController.swift`. Treat the
   identifiers and the render timings in it as given.
3. Write `docs/why-the-suite-was-green.md` with one entry per test: whether it
   could have failed, and if not, the precise mechanism that made it unfailable.
4. In the same document, give me a straight answer on Priya's branch.

## Input Files

Extract the following files before beginning.

=============== FILE: FieldmarkUITests/CheckoutUITests.swift ===============
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
        if promoField.waitForExistence(timeout: 3) {
            promoField.tap()
            promoField.typeText("AUTUMN10")
            app.buttons["promo-apply"].tap()
            XCTAssertEqual(app.staticTexts["order-total"].label, "$44.99")
        }
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
        XCTAssertTrue(app.staticTexts["order-confirmed"].exists)
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

=============== FILE: Fieldmark/Checkout/CheckoutViewController.swift ===============
import UIKit

// Identifiers on this screen were set when it was built (PR #2201) and have not
// changed since. Render timings noted per element for whoever picks up INC-4471.
final class CheckoutViewController: UIViewController {

    private let cartBadge = UILabel()        // always in the hierarchy; text is "0" when empty
    private let openPromoButton = UIButton()
    private let promoField = UITextField()   // promo screen is pushed, ~600ms incl. pricing fetch
    private let applyPromoButton = UIButton()
    private let orderTotal = UILabel()       // rewritten after the pricing response lands
    private let fieldError = UILabel()       // hidden until async validation returns, ~350ms
    private let payNowButton = UIButton()
    private let orderConfirmed = UILabel()   // after the payment round-trip, 1.5s-9s on CI

    override func viewDidLoad() {
        super.viewDidLoad()

        cartBadge.accessibilityIdentifier = "cart-badge"
        cartBadge.text = "0"
        cartBadge.isHidden = false

        openPromoButton.accessibilityIdentifier = "open-promo"
        promoField.accessibilityIdentifier = "promo-code-field"
        applyPromoButton.accessibilityIdentifier = "promo-apply"
        orderTotal.accessibilityIdentifier = "order-total"

        fieldError.accessibilityIdentifier = "field-error"
        fieldError.isHidden = true

        payNowButton.accessibilityIdentifier = "pay-now"

        orderConfirmed.accessibilityIdentifier = "order-confirmed"
        orderConfirmed.isHidden = true
    }

    func showValidationError(_ message: String) {
        fieldError.text = message
        fieldError.isHidden = false
    }

    func updateBadge(count: Int) {
        cartBadge.text = String(count)
    }
}

=============== FILE: reports/inc-4471.md ===============
# INC-4471 - promo codes have not applied since 2026-08-28

- 2026-08-28 14:02 UTC: pricing-service deploy 3.14.0. `/v2/promo/validate`
  begins returning 500 for every request. The promo screen pushes, then shows a
  generic failure state; `promo-code-field` never renders.
- 2026-08-28 -> 2026-09-09: 14 nightly runs of `CheckoutUITests`, 6 passed /
  0 failed on every one of them. `testPromoCodeApplies` green throughout.
- 2026-09-09 11:20 UTC: escalated by support after 31 tickets.

Local probe by @dev-mackay, 2026-09-09:

    Stubbed PromoViewController.viewDidLoad to return immediately, so the promo
    screen renders nothing at all. Ran the class on iPhone 15 / iOS 17.5:

    Test Suite 'CheckoutUITests' passed at 2026-09-09 12:41:07.331.
      Executed 6 tests, with 0 failures (0 unexpected) in 47.882 seconds

Screenshot attachments pulled from the 2026-09-08 nightly result bundle: every
attachment recorded for `testPromoCodeApplies` and for
`testCheckoutShowsNoValidationErrors` shows the cart screen. The promo screen and
the payment screen do not appear in any attachment from either test.

=============== FILE: reports/priya-branch.diff ===============
Branch: priya/settle-after-taps
Files changed: 1

--- a/FieldmarkUITests/CheckoutUITests.swift
+++ b/FieldmarkUITests/CheckoutUITests.swift
@@
     func testPromoCodeApplies() {
         app.buttons["cart-tab"].tap()
+        Thread.sleep(forTimeInterval: 2.0)
         app.buttons["open-promo"].tap()
+        Thread.sleep(forTimeInterval: 2.0)
         let promoField = app.textFields["promo-code-field"]
         if promoField.waitForExistence(timeout: 3) {
@@
     func testCheckoutShowsNoValidationErrors() {
         app.buttons["cart-tab"].tap()
+        Thread.sleep(forTimeInterval: 2.0)
         app.buttons["go-to-checkout"].tap()
+        Thread.sleep(forTimeInterval: 2.0)

Run on branch: Executed 6 tests, with 0 failures (0 unexpected) in 71.404 seconds
