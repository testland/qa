import UIKit

// PR #1880 (2026-03-11, @contractor-lowe): "stabilise transfer UI tests".
// PR #1996 (2026-08-14, @rafiq): first pass at audit finding A11Y-11.
final class TransferViewController: UIViewController {

    private let amountField = UITextField()
    private let recipientPicker = UIButton()
    private let payButton = UIButton()
    private let cancelItem = UIBarButtonItem()
    private let insufficientFundsLabel = UILabel()
    private let confirmationBanner = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()

        amountField.placeholder = NSLocalizedString("transfer.amount.placeholder", comment: "")
        amountField.accessibilityLabel = "amount_field"

        recipientPicker.setTitle(NSLocalizedString("transfer.recipient.title", comment: ""), for: .normal)

        payButton.setTitle(NSLocalizedString("transfer.pay.title", comment: ""), for: .normal)

        cancelItem.title = NSLocalizedString("transfer.cancel.title", comment: "")
        navigationItem.leftBarButtonItem = cancelItem

        insufficientFundsLabel.text = NSLocalizedString("transfer.error.insufficient", comment: "")
        insufficientFundsLabel.accessibilityLabel = "insufficient_funds_label"
        insufficientFundsLabel.isHidden = true

        confirmationBanner.accessibilityLabel = "confirmation_banner"
        confirmationBanner.isAccessibilityElement = false
        confirmationBanner.isHidden = true
    }

    func showConfirmation(reference: String) {
        confirmationBanner.text = String(
            format: NSLocalizedString("transfer.confirmed.format", comment: ""), reference
        )
        confirmationBanner.isHidden = false
    }
}
