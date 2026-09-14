# Android UI coverage asks for the November release
Raised by Ravi P, 2026-09-02. All five wanted before the release branch cuts.

1. **Order confirmation notification.** After a successful checkout the app posts
   a notification titled "Order confirmed". Pull down the notification shade, tap
   it, and check that the order detail screen for that order opens. Support gets
   a ticket about this roughly monthly.

2. **Unlocking saved cards.** On the account screen there is an Unlock saved
   cards button. Tapping it brings up our fingerprint prompt with the title
   "Unlock saved cards" and our own cancel wording underneath. Authenticate on
   it, and check that the saved-cards list (`saved_cards_root`) is then on
   screen. This is our most-reported "it did nothing" flow.

3. **Share a receipt.** From the order detail screen, tap Share. The Android
   share sheet opens. Pick the mail app, and check that the compose screen that
   opens has the order number in the subject line and the receipt total in the
   body.

4. **Help page links.** The Help screen is a `WebView` pointed at
   `https://help.northwind.example/app`. Check that the page contains a
   "Contact support" link, and that tapping it lands the user on the in-app
   support form (`support_form_root`) rather than leaving the app.

5. **Refunded order in the history list.** For an account with about 200 orders,
   check that the row for order `NW-10042` shows the status chip "Refunded".
   This one regressed twice in the spring and nobody caught it.
