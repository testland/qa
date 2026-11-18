- The card form is an iframe from https://pay.example-psp.com (cross-origin), with its own labels and error messages.
- The a11y team says the review queue lists each rule with only one element, even on pages with dozens of low-contrast
  badges over images, and the card form never shows up in any result.
- Last audit (manual): the card iframe's error message is not announced and its "CVC" field has no label.
