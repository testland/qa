# PII safe-value lookup tables

Reserved test ranges and issuer-published test values that pass real
format validators without matching a real person. Emit these constants
instead of trusting a generator's defaults, which may collide with a
real number.

## Phone numbers - region-specific test ranges

| Region | Test range                                |
|--------|-------------------------------------------|
| US     | `(555) 0100` - `(555) 0199` (per Numbering Plan documentation, reserved for fictional use). |
| UK     | `0790 7900 000-999` (Ofcom reserved for drama/fiction). |
| Germany | `+49 (123) 4567-...` patterns reserved for examples. |

Faker's `phone_number` defaults to format-valid but doesn't guarantee
non-real numbers. For absolute safety, post-process generated phone
numbers to substitute the regional test range.

## Government IDs - never generate real-format

| ID                   | Synthetic strategy                                          |
|----------------------|-------------------------------------------------------------|
| US SSN               | Use the IRS test range `900-XX-XXXX` to `999-XX-XXXX` (not validly issued). Faker's `ssn()` defaults to invalid-format strings. |
| US ITIN              | Format: `9XX-7X-XXXX` or `9XX-8X-XXXX` (range reserved for ITIN issuance; never generate real values). |
| UK NI Number         | `AB123456C` patterns; use `JR987654A` style which HMRC reserves. |
| Generic              | If your test environment doesn't enforce format validation, use obvious-fake values like `000-00-0000`. |

**Never generate values from a real-issuance range.** A correctly-
formatted but real-issuance SSN may collide with a real person - the
exact privacy violation this skill avoids.

## Credit card numbers - test BIN ranges

Major card networks publish **test BIN ranges** that pass Luhn checksum
but never authorize. Use these in test fixtures:

| Card type        | Test BIN (use with random suffix; Luhn-valid)              |
|------------------|------------------------------------------------------------|
| Visa             | `4111 1111 1111 1111`                                      |
| Mastercard       | `5555 5555 5555 4444`                                      |
| American Express | `3782 822463 10005`                                        |
| Discover         | `6011 1111 1111 1117`                                      |

(Standard Stripe / Adyen test cards; documented in their respective
testing guides.) Faker's `credit_card_number()` produces format-valid
values but may collide with a real card if the issuer's BIN happens to
match; the Stripe / Adyen test cards are guaranteed safe.
