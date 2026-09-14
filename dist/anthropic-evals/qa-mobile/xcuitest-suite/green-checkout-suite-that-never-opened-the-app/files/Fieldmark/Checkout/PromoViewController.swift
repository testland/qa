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
