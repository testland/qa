# PCI DSS scope catalog - SAQ levels, PAN-storage rules, scope-reduction patterns

Pure-reference catalog of PCI DSS v4.0 scope reduction techniques + the
testable scope boundaries. This is the catalog of WHY the boundary matters
and what it makes testable; the SKILL.md steps are the workflow that verifies
a given integration against it.

**Scope reduction** is the dominant strategy: keep card data off your systems
entirely, so PCI compliance becomes minimal SAQ A instead of full SAQ D.

## How to use this catalog

1. **Identify your integration pattern** - review the scope-reduction patterns
   below (hosted fields, redirect, tokenization, network segmentation) and
   match the one your payment integration uses.
2. **Determine your SAQ level** - use the SAQ table to confirm which
   Self-Assessment Questionnaire level applies given how cardholder data flows
   through your system.
3. **Verify testable behaviours** - cross-reference the Testable behaviours
   table and anti-patterns, then run the SKILL.md steps against the boundary.

## SAQ levels (Self-Assessment Questionnaire)

Per [pcisecuritystandards.org](https://www.pcisecuritystandards.org/document_library/):

| SAQ | Description | Scope |
|---|---|---|
| **A** | Card-not-present, fully outsourced (hosted gateway pages, iFrame redirects, Stripe Elements) | Smallest - your servers never see PAN |
| **A-EP** | Hosted-form-with-merchant-customisation (e.g., your domain shows the form but iframe is the gateway's) | Slightly larger; some elements visible to your server |
| **D** | All merchants not covered by A-C; full PCI DSS | Largest - for cases where you must handle PAN |

Choose **A** when feasible: PAN never touches your servers because
the customer inputs it directly into a gateway-hosted iframe / element.

## PAN storage rules

Per PCI DSS v4.0 §3.4: prohibited storage of:

- Full PAN cleartext anywhere
- Sensitive authentication data (full track, CVV/CVC, PIN/PIN
  block) **post-authorisation**
- More than first-6 + last-4 digits in any retained data
  (truncated)

Allowed:

- First-6 + last-4 digits (truncated PAN)
- Tokens issued by the gateway (e.g., Stripe `pm_*`)
- Encrypted PAN with strong key management (if you must store
  full PAN)

Tests for storage (PostgreSQL `~` regex operator):

```sql
-- Detect prohibited PAN patterns in any string column
SELECT * FROM <any_table>
WHERE  column ~ '^[0-9]{13,19}$'
    OR column ~ '^4[0-9]{15}$'
    OR column ~ '^5[1-5][0-9]{14}$'
LIMIT 10;
-- Expect: 0 rows
```

## Scope-reduction patterns

### 1. Hosted fields / Elements

Per [stripe.com/docs/payments/payment-element](https://docs.stripe.com/payments/payment-element),
[docs.adyen.com/payment-methods/cards/web-drop-in](https://docs.adyen.com/payment-methods/cards/web-drop-in),
[developer.paypal.com/braintree/docs/start/hosted-fields](https://developer.paypal.com/braintree/docs/start/hosted-fields):

```html
<!-- Stripe Element -->
<form>
  <div id="payment-element"></div>   <!-- iframe; PAN stays in Stripe's iframe -->
  <button>Pay</button>
</form>
```

PAN never reaches your JS or backend. The Element sends to
Stripe directly; your server gets a token.

### 2. Redirect-to-gateway

Customer redirects to gateway-hosted page; pays; redirects back
with a token / transaction ID.

PCI-friendly because PAN never on your domain. UX-tradeoff:
slower, less branded.

### 3. Tokenization API

Backend-to-backend: customer submits PAN to gateway directly
(via JS); gateway returns token; your code uses token.

Variants per gateway: Stripe `setupIntent` for saved cards;
Adyen `paymentMethods.storeDetails`; PayPal Vault.

### 4. Network segmentation

If you must touch PAN, isolate it in a separate network with
strict ingress / egress + monitoring. Reduces scope of the
broader IT environment.

## Testable behaviours

| Behaviour | Test |
|---|---|
| No 16-digit numbers in DB | SQL regex against all string columns |
| No CVV / CVC stored | Search code for `cvc`, `cvv`, `cardholderVerification` |
| Hosted fields render without exposing PAN to your JS | Browser DevTools Network tab - no PAN in requests to your origin |
| Webhooks contain tokens not PAN | Parse webhook payloads; assert no 16-digit numbers |
| Log scrubbing | Test logs for PAN patterns; should be redacted |
| Backup snapshots PAN-free | Same regex against backup files |
| Egress firewall blocks card-network IPs | Network test |

The SKILL.md steps run these adversarially; this catalog provides the
rationale.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Log entire payment request body | PAN in logs | Scrub at log emit |
| Stage card-collection on your own page | Cards now in your domain → SAQ D | Use hosted fields |
| Send PAN to backend then forward to gateway | Server now PCI-scope | Direct JS-to-gateway |
| Store PAN encrypted "just in case" | Key management is half of PCI DSS | Use tokens |
| Test PAN in fixtures | Real PAN in commits | Use only platform-provided test PANs |
| Capture CVV server-side | PCI DSS v4.0 §3.2.1: prohibited post-auth | Don't capture or capture in scoped iframe |
| Skip scope-checker in CI | Drift over time | Periodic scope audit |

## Limitations

- **PCI DSS v4.0 is paywalled** (cite by stable ID). Gateway docs
  paraphrase the relevant clauses.
- **Scope is a moving target.** Adding a new feature can pull
  PAN into your system; re-audit on architecture changes.
- **PCI compliance ≠ PCI security.** Compliance is a baseline;
  actual security needs more (threat modeling, pentest, etc.).
- **Doesn't cover PA-DSS** (Payment Application DSS for POS
  software).

## Sources

- PCI DSS v4.0 (cite by stable ID):
  [pcisecuritystandards.org/document_library/](https://www.pcisecuritystandards.org/document_library/).
- Stripe Element (scope-reduction):
  [docs.stripe.com/payments/payment-element](https://docs.stripe.com/payments/payment-element).
- Adyen Drop-in:
  [docs.adyen.com/payment-methods/cards/web-drop-in](https://docs.adyen.com/payment-methods/cards/web-drop-in).
- Braintree Hosted Fields:
  [developer.paypal.com/braintree/docs/start/hosted-fields](https://developer.paypal.com/braintree/docs/start/hosted-fields).
