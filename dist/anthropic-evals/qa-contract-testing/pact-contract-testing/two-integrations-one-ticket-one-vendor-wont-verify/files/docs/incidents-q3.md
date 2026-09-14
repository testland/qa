# Q3 incident summaries (extract)

## INC-2211 - quote page shows full price for every order

2026-07-22, 14:05-17:45 UTC. Cause: pricing-service renamed the response field
`discount_cents` to `discount_amount_cents` and removed the old key in the same
release. Our reader returned undefined and the page rendered the undiscounted
total. Detected by a customer email. Pricing deployed on their own schedule;
nothing in either pipeline compared the two sides.

## INC-2264 - checkout throws on every rate quote

2026-08-14, 09:12-10:04 UTC. Cause: Shiplane changed `eta_days` from integer to
string ("3-5") in production. Detected by our own 5xx alert 40 minutes after their
release window. Their changelog entry appeared 2026-08-16, two days after the
incident. Support ticket acknowledged 2026-08-25.

Post-incident note from Vikram, 2026-09-02: "Worth recording that our sandbox
account was still returning `eta_days: 5` as an integer for two and a half weeks
after this. I re-checked it on 2026-08-28 and it was still the old shape. It
changed over sometime around 2026-09-01."
