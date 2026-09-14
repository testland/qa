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
