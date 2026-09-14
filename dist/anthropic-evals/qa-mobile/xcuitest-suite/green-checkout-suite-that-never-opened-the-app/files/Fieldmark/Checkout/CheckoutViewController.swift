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
