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
