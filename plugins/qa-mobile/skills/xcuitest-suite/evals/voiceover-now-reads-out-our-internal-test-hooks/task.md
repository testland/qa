# The accessibility audit is blocking our attestation and the Spanish lane is red

## Problem Description

Halden Bank ships an iOS app. Last spring a contractor was brought in to stop the
transfer-flow UI tests breaking every time marketing reworded a control. His work
went in as PR #1880 and it did what it was asked to do — the controls he touched
have not broken on a copy change since.

Three things have come out of it.

The accessibility audit we commissioned for our 2026 Section 508 attestation was
delivered on 2026-09-02 and re-scanned on 2026-09-08. The transcript is attached.
Customers using VoiceOver are being read strings that were obviously never meant
for them. We have a bank-wide commitment here and I cannot attest with A11Y-11
open.

The es-MX launch is 2026-10-01. We stood up a second device lane running the
Spanish build a fortnight ago and four of the six tests in `TransferUITests` are
red on it. A fifth is red on the English lane too and has been since 8.2.2
shipped. The translations were done by the agency and signed off — please do not
change a single string value in either `Localizable.strings`.

Three proposals are on the table and I do not trust any of them enough to pick:

- Rafiq did the 8.2.2 pass on A11Y-11 and wants to finish it the same way he
  started it: take the elements that announce internal strings out of the
  accessibility tree entirely, the way he did for the confirmation banner in
  8.2.2. VoiceOver then has nothing to read out on them, and the audit stopped
  reporting the banner under A11Y-11 the moment he did it.
- Priya wants the app launched under the test target with `-AppleLanguages (en)`
  so the strings are predictable on both lanes. Green by tonight, she says, and
  the Spanish build is what the manual testers are for.
- Mateo wants close to the opposite: each lane pinned to its own locale at
  launch — `-AppleLanguages (es-MX)` with `-AppleLocale es_MX` on the Spanish
  lane and the English pair on the English lane — so that a lane's result stops
  depending on how the fleet happened to leave that device configured. The
  incident he is referring to is attached.

I need the transfer flow covered on both lanes, I need VoiceOver saying the right
thing to a customer on a production build, and I need to know what was actually
wrong with PR #1880, because from where I sit it solved the problem it was asked
to solve.

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
   verdict on each of the three proposals that I can send back today.

## Input Files

Extract the following files before beginning.

=============== FILE: Halden/Transfer/TransferViewController.swift ===============
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

=============== FILE: Halden/Accounts/AccountSummaryView.swift ===============
import SwiftUI

struct AccountSummaryView: View {
    let balanceFormatted: String
    let onTransferTapped: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(balanceFormatted)
                .font(.largeTitle)
                .accessibilityLabel("balance_label")

            Button(LocalizedStringKey("accounts.transfer.button"), action: onTransferTapped)
                .accessibilityLabel("open_transfer_button")
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
# Halden iOS - accessibility audit extract, account + transfer flow

## Scan 1 - build 8.2.1, 2026-09-02

Device: iPhone 15, iOS 17.5, VoiceOver on, system language English (US).
Swiping through the account summary and the transfer screen, announced verbatim:

    "balance underscore label"
    "open underscore transfer underscore button, button"
    "amount underscore field, text field"
    "Choose recipient, button"
    "Pay, button"
    "insufficient underscore funds underscore label"   (after an over-balance attempt)
    "confirmation underscore banner"                   (after a completed transfer)

Finding A11Y-11 (blocker): five elements across these two screens expose
developer-internal strings to assistive technology. Reproduced on iOS 16.7 and
17.5, English and Spanish builds. A screen reader user cannot tell what the
amount field or the transfer button is for.

## Scan 2 - build 8.2.2, 2026-09-08

Same device and settings. Re-run of the transfer flow, announced verbatim:

    "balance underscore label"
    "open underscore transfer underscore button, button"
    "amount underscore field, text field"
    "Choose recipient, button"
    "Pay, button"
    "insufficient underscore funds underscore label"
    (nothing announced after a completed transfer)

A11Y-11 remains open on the four elements above.

Finding A11Y-19 (blocker, new in 8.2.2): the transfer confirmation is no longer
announced at all. A VoiceOver user who completes a transfer receives no
confirmation of any kind. The banner is visible on screen and absent from the
accessibility tree.

=============== FILE: reports/lane-runs-2026-09-11.txt ===============
Lane: ios-en-US, iPhone 15, iOS 17.5, system language English (US), build 8.2.2

Test Case '-[TransferUITests testBalanceIsShownOnSummary]' passed (6.771 seconds).
Test Case '-[TransferUITests testCancelReturnsToSummary]' passed (9.140 seconds).
Test Case '-[TransferUITests testOpensTransferFromSummary]' passed (8.402 seconds).
Test Case '-[TransferUITests testPickRecipientBeforePaying]' passed (10.221 seconds).
Test Case '-[TransferUITests testRejectsTransferOverBalance]' passed (12.004 seconds).
Test Case '-[TransferUITests testSendsATransfer]' failed (14.905 seconds).
  Failed to get matching snapshot: No matches found for StaticText "confirmation_banner"
Executed 6 tests, with 1 failure (0 unexpected) in 61.443 seconds

(green on every run up to and including build 8.2.1 on 2026-08-13)

Lane: ios-es-MX, iPhone 15, iOS 17.5, system language Spanish (Mexico), build 8.2.2

Test Case '-[TransferUITests testBalanceIsShownOnSummary]' passed (6.882 seconds).
Test Case '-[TransferUITests testCancelReturnsToSummary]' failed (11.660 seconds).
  Failed to get matching snapshot: No matches found for Button "Cancel" in NavigationBar
Test Case '-[TransferUITests testOpensTransferFromSummary]' passed (8.511 seconds).
Test Case '-[TransferUITests testPickRecipientBeforePaying]' failed (13.221 seconds).
  Failed to get matching snapshot: No matches found for Button "Choose recipient"
Test Case '-[TransferUITests testRejectsTransferOverBalance]' failed (15.118 seconds).
  Failed to get matching snapshot: No matches found for Button "Pay"
Test Case '-[TransferUITests testSendsATransfer]' failed (14.960 seconds).
  Failed to get matching snapshot: No matches found for Button "Pay"
Executed 6 tests, with 4 failures (0 unexpected) in 70.077 seconds

=============== FILE: reports/lane-config-incident-2026-08-21.md ===============
# The Spanish lane was not running Spanish for three days

2026-08-18: device fleet reimaged. The four devices allocated to ios-es-MX came
back with the system language left at English (US); the provisioning script sets
the region but not the language.

2026-08-18 to 2026-08-21: ios-es-MX reported 6 passed / 0 failed on every run.
Nobody looked, because it was green.

2026-08-21: noticed by @mateo while screenshotting for the launch deck. Language
set by hand on all four devices. Lane went to 4 failures on the next run and has
stayed there.

No alert fired at any point. Nothing in the run output states which language the
app was actually running in.
