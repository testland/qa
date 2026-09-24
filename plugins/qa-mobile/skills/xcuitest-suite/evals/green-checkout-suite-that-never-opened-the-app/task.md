# Our checkout tests were green through an eleven-day outage on the screen they cover

## Problem Description

Fieldmark is an iOS retail app. `CheckoutUITests` has six tests and runs nightly
against a pinned simulator. It has been green on every run since April.

On 2026-09-09 support escalated INC-4471. Since the pricing-service deploy on
2026-08-28, `/v2/promo/context` has returned 500 for every request: the promo
screen still pushes, it shows its unavailable state, and no customer has been
able to apply a promo code for eleven days. Fourteen nightly runs went green
across that window. `testPromoCodeApplies` is the test we point at in the release
checklist as the reason we stopped checking that screen by hand.

Attached are the test class, the two view controllers behind the checkout and
promo screens, the incident note, and the per-test timings from the nightly on
either side of the deploy. Nothing about the app's accessibility identifiers
changed in that window — the promo screen was built in PR #2201 and has not been
touched since.

Two people have put something forward and I want a view on both before I pick:

- Dev wants the checkout tests pointed at the stub pricing service we already
  ship behind the `-stubPricing` launch argument, so the promo screen renders a
  known total on every run and the nightly stops depending on whether a
  downstream service happens to be up that night. He has the stub returning
  AUTUMN10 at 10% off a $49.99 cart, so the promo total lands on $44.99.
- Priya wants `testPromoCodeApplies` wrapped in `XCTExpectFailure` until pricing
  is fixed. Her argument is that we keep the test instead of commenting it out,
  the nightly goes back to green so the team stops ignoring it, and we take the
  wrapper off the day the fix lands. Her patch is attached.

What I want out of this is for the six tests to be worth the twenty minutes of
runner time they cost. Tell me what actually happened, and fix what is wrong with
them.

## Output Specification

1. Rewrite `FieldmarkUITests/CheckoutUITests.swift` so that each test fails when
   the behaviour its own method name describes is broken. Do not delete or rename
   a test, and do not weaken an assertion that is already doing real work.
2. Do not change either view controller. Treat the identifiers and the render
   paths in them as given.
3. Write `docs/why-the-suite-was-green.md` explaining how fourteen nightly runs
   reported success across the outage, and give me a straight answer on Dev's
   proposal and on Priya's.

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

=============== FILE: Fieldmark/Checkout/CheckoutViewController.swift ===============
import UIKit

final class CheckoutViewController: UIViewController {

    private let cartBadge = UILabel()
    private let openPromoButton = UIButton()
    private let postcodeField = UITextField()
    private let continueButton = UIButton()
    private let fieldError = UILabel()
    private let payNowButton = UIButton()
    private let orderId = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()

        cartBadge.accessibilityIdentifier = "cart-badge"
        cartBadge.text = "0"
        cartBadge.isHidden = false

        openPromoButton.accessibilityIdentifier = "open-promo"
        postcodeField.accessibilityIdentifier = "shipping-postcode"
        continueButton.accessibilityIdentifier = "continue-to-payment"
        payNowButton.accessibilityIdentifier = "pay-now"

        fieldError.accessibilityIdentifier = "field-error"
        fieldError.isHidden = true

        orderId.accessibilityIdentifier = "order-id"
        orderId.isHidden = true
    }

    func updateBadge(count: Int) {
        cartBadge.text = String(count)
    }

    @objc private func continueTapped() {
        ValidationClient.shared.validate(postcode: postcodeField.text) { [weak self] result in
            guard let self else { return }
            switch result {
            case .ok:
                self.pushPaymentStep()
            case .rejected(let message):
                self.fieldError.text = message
                self.fieldError.isHidden = false
            }
        }
    }

    func showOrderConfirmation(id: String) {
        orderId.text = id
        orderId.isHidden = false
    }
}

=============== FILE: Fieldmark/Checkout/PromoViewController.swift ===============
import UIKit

final class PromoViewController: UIViewController {

    private let promoField = UITextField()
    private let applyButton = UIButton()
    private let promoTotal = UILabel()
    private let promoError = UILabel()
    private let unavailable = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()

        unavailable.accessibilityIdentifier = "promo-unavailable"
        unavailable.isHidden = true

        promoError.accessibilityIdentifier = "promo-error"
        promoError.isHidden = true

        PricingClient.shared.promoContext { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let context):
                self.installEntryForm(context)
            case .failure:
                self.unavailable.text = NSLocalizedString("promo.unavailable", comment: "")
                self.unavailable.isHidden = false
            }
        }
    }

    private func installEntryForm(_ context: PromoContext) {
        promoField.accessibilityIdentifier = "promo-code-field"
        applyButton.accessibilityIdentifier = "promo-apply"
        promoTotal.accessibilityIdentifier = "promo-total"
        promoTotal.text = context.formattedTotal
        view.addSubview(promoField)
        view.addSubview(applyButton)
        view.addSubview(promoTotal)
    }

    func showCodeRejected(_ message: String) {
        promoError.text = message
        promoError.isHidden = false
    }

    func applyAccepted(newTotal: String) {
        promoTotal.text = newTotal
        promoError.isHidden = true
    }
}

=============== FILE: reports/inc-4471.md ===============
# INC-4471 - promo codes have not applied since 2026-08-28

- 2026-08-28 14:02 UTC: pricing-service deploy 3.14.0. `/v2/promo/context`
  begins returning 500 for every request.
- 2026-08-28 -> 2026-09-09: 14 nightly runs of `CheckoutUITests`.
  6 passed / 0 failed on every one of them.
- 2026-09-09 11:20 UTC: escalated by support after 31 customer tickets.
- Pricing rollback is scheduled for 2026-09-15. Until then the promo screen
  shows its unavailable state on every device.

Nightly run summary, `CheckoutUITests`, iPhone 15 / iOS 17.5, per-test duration
in seconds:

| Test                                | 2026-08-26 | 2026-08-27 | 2026-09-07 | 2026-09-08 |
|-------------------------------------|-----------:|-----------:|-----------:|-----------:|
| testCartBadgeCountsItems            |        6.1 |        6.0 |        6.2 |        6.1 |
| testCheckoutShowsNoValidationErrors |        9.4 |        9.5 |        9.3 |        9.4 |
| testEmptyCartShowsPlaceholder       |        7.8 |        7.7 |        7.9 |        7.8 |
| testGuestCheckoutRejectsBlankEmail  |        8.2 |        8.1 |        8.2 |        8.3 |
| testOrderConfirmationShowsOrderId   |       12.0 |       12.1 |       12.0 |       12.1 |
| testPromoCodeApplies                |        8.7 |        8.6 |       11.7 |       11.6 |
| **Suite total**                     |       52.2 |       52.0 |       55.3 |       55.3 |

Runner: the same shared mac mini throughout, two jobs scheduled on it, no
configuration change in the window. Xcode 16.2 throughout.

=============== FILE: reports/priya-patch.diff ===============
Branch: priya/expect-failure-until-pricing-fixed
Files changed: 1

--- a/FieldmarkUITests/CheckoutUITests.swift
+++ b/FieldmarkUITests/CheckoutUITests.swift
@@
     func testPromoCodeApplies() {
+        // remove when INC-4471 is closed (pricing rollback 2026-09-15)
+        XCTExpectFailure("promo context returns 500, see INC-4471", strict: false)
         app.buttons["cart-tab"].tap()
         app.buttons["open-promo"].tap()
         let promoField = app.textFields["promo-code-field"]

Run on branch: Executed 6 tests, with 0 failures (0 unexpected) in 55.301 seconds

Priya, in the thread: "the point is we do not lose the test. It stays in the
file, it stays in the run, and the nightly goes back to a colour people look at.
Commenting it out is how tests die."
