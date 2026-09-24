# Suite results by locale and platform, build 2.4.0

| Run                       | Green | Red |
|---------------------------|-------|-----|
| iOS simulator, en-US      | 26    | 0   |
| iOS simulator, de-DE      | 7     | 19  |
| iOS simulator, ar-EG      | 5     | 21  |
| Android emulator, en-US   | 24    | 2   |
| Android emulator, de-DE   | 5     | 21  |

## Representative German output, iOS simulator

```
FAIL e2e/catalogue.test.js
  x adds a product to the cart from the product card
      Test Failed: No elements found for "TEXT == "Add to cart""
         (the button reads "In den Warenkorb")
  x shows an out-of-stock notice
      Test Failed: No elements found for "TEXT == "Out of stock""
         (the screen shows "Nicht vorraetig")

FAIL e2e/checkout.test.js
  x shows the subtotal for a single line
      Test Failed: No elements found for "TEXT == "$4.99""
         (the screen shows "4,99 EUR-sign")
  x lets the shopper pick a delivery date
      Test Failed: No elements found for "LABEL == "Delivery date""
         (the accessibility label is "Lieferdatum")
```

## The 2 long-standing failures - English, both platforms, same build

```
FAIL e2e/catalogue.test.js
  x shows the organic badge on organic products
      Test Failed: No elements found for "CLASS == "RCTImageView""

FAIL e2e/checkout.test.js
  x lets the shopper pick a delivery date
      Test Failed: No elements found for "CLASS == "RCTImageView""
```

Same two specs, green on iOS, red on Android, every run since 2026-08-11.
Nobody has opened a ticket.
