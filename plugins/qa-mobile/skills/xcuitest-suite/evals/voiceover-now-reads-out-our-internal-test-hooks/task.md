# VoiceOver is announcing "pay underscore button" to customers and the Spanish lane is red

## Problem Description

Halden Bank ships an iOS app. Last spring a contractor was brought in to stop the
transfer-flow UI tests breaking every time marketing reworded a control. His fix
went in as PR #1880 and it did work — the controls he touched have not broken on
a copy change since.

Two things have come out of it.

The first is the accessibility audit we commissioned for our 2026 Section 508
attestation, delivered 2026-09-02. The auditor's VoiceOver transcript of the
account and transfer screens is attached. Customers who use VoiceOver are being
read strings like "amount underscore field" and "open underscore transfer
underscore button" where they should be hearing the name of the control. We have
a bank-wide commitment here and I cannot attest with this open.

The second is the es-MX launch on 2026-10-01. We stood up a second device lane
running the Spanish build a fortnight ago and four of the six tests in
`TransferUITests` are red on it and green on the English lane. The translations
were done by the agency and signed off — please do not change a single string
value in either `Localizable.strings`.

Two proposals are on the table and I do not trust either enough to pick one:

- Priya wants to launch the app under the test target with `-AppleLanguages (en)`
  in `launchArguments` so the strings are predictable again. Both lanes green by
  tonight, she says, and the Spanish build is what the manual testers are for.
- The contractor, over email, says to keep what he did and gate it: leave the
  production strings alone in the normal build and only swap them in when a
  `-UITesting` launch argument is present, so the tests get their stable strings
  and customers get the real ones.

I need the transfer flow covered on both lanes, and I need VoiceOver saying the
right thing to a customer on a production build. Tell me how, and tell me what
was actually wrong with PR #1880, because from where I sit it solved the problem
it was asked to solve.

## Output Specification

1. Edit `Halden/Transfer/TransferViewController.swift` and
   `Halden/Accounts/AccountSummaryView.swift` so that a customer running
   VoiceOver on a production build hears the user-facing name of each control,
   in the language the device is set to.
2. Edit `HaldenUITests/TransferUITests.swift` so all six tests pass on both the
   en-US and the es-MX lane.
3. Do not change any string value in `Halden/en.lproj/Localizable.strings` or
   `Halden/es-MX.lproj/Localizable.strings`, and do not drop an assertion.
4. Write `docs/transfer-hooks-decision.md`: what PR #1880 got wrong, and a
   verdict on each of the two proposals that I can send back today.

## Input Files

Extract the following files before beginning.

=============== FILE: Halden/Transfer/TransferViewController.swift ===============
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

=============== FILE: Halden/Accounts/AccountSummaryView.swift ===============
import SwiftUI

struct AccountSummaryView: View {
    let balanceFormatted: String
    let onTransferTapped: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(balanceFormatted)
                .font(.largeTitle)
                .accessibilityLabel("balance_label")            // #1880

            Button(LocalizedStringKey("accounts.transfer.button"), action: onTransferTapped)
                .accessibilityLabel("open_transfer_button")     // #1880
        }
        .padding()
    }
}

=============== FILE: HaldenUITests/TransferUITests.swift ===============
import XCTest

final class TransferUITests: XCTestCase {

    let app = XCUIApplication()

    override func setUpWithError() throws {
        app.launchArguments = ["-resetAccounts", "-seedBalance", "120450"]
        app.launch()
    }

    func testOpensTransferFromSummary() {
        app.buttons["open_transfer_button"].tap()
        XCTAssertTrue(app.otherElements["transfer-screen"].waitForExistence(timeout: 5))
    }

    func testBalanceIsShownOnSummary() {
        XCTAssertTrue(app.staticTexts["balance_label"].waitForExistence(timeout: 5))
    }

    func testSendsATransfer() {
        app.buttons["open_transfer_button"].tap()
        app.textFields["amount_field"].tap()
        app.textFields["amount_field"].typeText("25.00")
        app.buttons["Pay"].tap()
        let banner = app.staticTexts["confirmation_banner"]
        XCTAssertTrue(banner.waitForExistence(timeout: 10))
    }

    func testPickRecipientBeforePaying() {
        app.buttons["open_transfer_button"].tap()
        app.buttons["Choose recipient"].tap()
        XCTAssertTrue(app.tables["recipient-list"].waitForExistence(timeout: 5))
    }

    func testRejectsTransferOverBalance() {
        app.buttons["open_transfer_button"].tap()
        app.textFields["amount_field"].tap()
        app.textFields["amount_field"].typeText("99999.00")
        app.buttons["Pay"].tap()
        let error = app.staticTexts["insufficient_funds_label"]
        XCTAssertTrue(error.waitForExistence(timeout: 5))
        XCTAssertEqual(error.label, "insufficient_funds_label")
    }

    func testCancelReturnsToSummary() {
        app.buttons["open_transfer_button"].tap()
        app.navigationBars.buttons["Cancel"].tap()
        XCTAssertTrue(app.staticTexts["balance_label"].waitForExistence(timeout: 5))
    }
}

=============== FILE: Halden/en.lproj/Localizable.strings ===============
"transfer.amount.placeholder" = "Amount";
"transfer.recipient.title" = "Choose recipient";
"transfer.pay.title" = "Pay";
"transfer.error.insufficient" = "Not enough funds in this account";
"transfer.confirmed.format" = "Transfer sent. Reference %@";
"transfer.cancel.title" = "Cancel";
"accounts.transfer.button" = "Transfer money";
"accounts.balance.accessibility" = "Available balance";

=============== FILE: Halden/es-MX.lproj/Localizable.strings ===============
"transfer.amount.placeholder" = "Importe";
"transfer.recipient.title" = "Elegir destinatario";
"transfer.pay.title" = "Pagar";
"transfer.error.insufficient" = "Fondos insuficientes en esta cuenta";
"transfer.confirmed.format" = "Transferencia enviada. Referencia %@";
"transfer.cancel.title" = "Cancelar";
"accounts.transfer.button" = "Transferir dinero";
"accounts.balance.accessibility" = "Saldo disponible";

=============== FILE: reports/a11y-audit-2026-09-02.md ===============
# Halden iOS 8.2.1 - accessibility audit extract, account + transfer flow

Device: iPhone 15, iOS 17.5, VoiceOver on, system language English (US).

Swiping through the account summary and the transfer screen, announced verbatim:

    "balance underscore label"
    "open underscore transfer underscore button, button"
    "amount underscore field, text field"
    "Choose recipient, button"                     <- correct
    "Pay, button"                                  <- correct
    "insufficient underscore funds underscore label"   (after an over-balance attempt)

Expected announcements, from the screens' own visible copy: "Available balance,
1,204.50 dollars"; "Transfer money, button"; "Amount, text field"; and the
insufficient-funds message read as written. The two controls announced correctly
show what the rest of the screen should sound like.

Finding A11Y-11 (blocker): four elements across these two screens expose
developer-internal strings to assistive technology. Reproduced on iOS 16.7 and
17.5, English and Spanish builds. A screen reader user cannot tell what the
amount field or the transfer button is for.

=============== FILE: reports/es-MX-lane-2026-09-11.txt ===============
Lane: ios-es-MX, iPhone 15, iOS 17.5, system language Spanish (Mexico)
Lane: ios-en-US, iPhone 15, iOS 17.5 - 6 passed, 0 failed

Test Case '-[TransferUITests testOpensTransferFromSummary]' passed (8.402 seconds).
Test Case '-[TransferUITests testBalanceIsShownOnSummary]' passed (6.771 seconds).

Test Case '-[TransferUITests testSendsATransfer]' failed (14.905 seconds).
  Failed to get matching snapshot: No matches found for Button "Pay"

Test Case '-[TransferUITests testPickRecipientBeforePaying]' failed (13.221 seconds).
  Failed to get matching snapshot: No matches found for Button "Choose recipient"

Test Case '-[TransferUITests testRejectsTransferOverBalance]' failed (15.118 seconds).
  Failed to get matching snapshot: No matches found for Button "Pay"

Test Case '-[TransferUITests testCancelReturnsToSummary]' failed (11.660 seconds).
  Failed to get matching snapshot: No matches found for Button "Cancel" in NavigationBar

Executed 6 tests, with 4 failures (0 unexpected) in 70.077 seconds
