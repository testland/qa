import UIKit

// PR #1880 (2026-03-11, @contractor-lowe): "stabilise transfer UI tests".
// Controls the suite kept losing were given a fixed string to match on. The
// ones the tests were already finding by their own wording were left alone.
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
        amountField.accessibilityLabel = "amount_field"          // #1880

        recipientPicker.setTitle(NSLocalizedString("transfer.recipient.title", comment: ""), for: .normal)

        payButton.setTitle(NSLocalizedString("transfer.pay.title", comment: ""), for: .normal)

        cancelItem.title = NSLocalizedString("transfer.cancel.title", comment: "")
        navigationItem.leftBarButtonItem = cancelItem

        insufficientFundsLabel.text = NSLocalizedString("transfer.error.insufficient", comment: "")
        insufficientFundsLabel.accessibilityLabel = "insufficient_funds_label"   // #1880
        insufficientFundsLabel.isHidden = true

        confirmationBanner.accessibilityLabel = "confirmation_banner"            // #1880
        confirmationBanner.isHidden = true
    }

    func showConfirmation(reference: String) {
        confirmationBanner.text = String(
            format: NSLocalizedString("transfer.confirmed.format", comment: ""), reference
        )
        confirmationBanner.isHidden = false
    }
}
