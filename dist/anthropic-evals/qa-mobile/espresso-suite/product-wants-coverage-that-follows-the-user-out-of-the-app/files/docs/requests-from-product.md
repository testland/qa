# Automation requests - Dana, 2026-09-08

1. When a customer has notifications switched off we show a banner with an
   "Open settings" button. I want a test that taps it, turns notifications on,
   comes back to the app and confirms the banner is gone.

2. Tapping the heart on a product pops up a little message that says "Saved to
   your wishlist". It stopped appearing for two weeks in July and nobody
   noticed. I want that message covered.

3. The background sync writes failures to a screen the customer sees when they
   next open the app. That screen was broken for the whole of the August release
   and showed a blank panel. I want a test that makes the sync fail and confirms
   the screen tells the customer what happened.

4. A customer picks a profile photo through the picker the phone provides. Twice
   this year the photo has come back and then not appeared on the profile. I
   want that covered.

5. Order history is a long list. Support keeps getting tickets saying an order
   is missing when it is just further down. I want a test that finds order
   NW-10042 in an account with four hundred orders and confirms it shows the
   right total.
