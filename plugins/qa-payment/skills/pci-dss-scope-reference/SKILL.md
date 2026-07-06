---
name: pci-dss-scope-reference
description: "Pure-reference catalog of PCI DSS v4.0 scope reduction techniques + the testable scope boundaries. Covers the SAQ levels (A through D, picked by how cardholder data flows), the PAN-storage prohibitions (only first-6 + last-4 retained; nothing else cleartext), the tokenization + hosted-fields scope-reduction patterns (Stripe Elements / Adyen Drop-in / Braintree Hosted Fields keep PAN off your servers), Network-Segmentation as PCI scope-reduction, and the testable behaviours the scope boundary creates. Distinct from qa-compliance/pci-dss-scope-checker (the compliance / scope-verification skill); this is the catalog of WHY the boundary matters. Use when designing or auditing the PCI scope of a payment integration."
---

# pci-dss-scope-reference

## Overview

PCI DSS (Payment Card Industry Data Security Standard) governs
the handling of cardholder data. Per
[pcisecuritystandards.org](https://www.pcisecuritystandards.org/document_library/),
PCI DSS v4.0 is the current spec (replaced v3.2.1 in 2024).

**Scope reduction** is the dominant strategy: keep card data off
your systems entirely, so PCI compliance becomes minimal SAQ A
instead of full SAQ D.

This skill is **distinct from**
`qa-compliance/pci-dss-scope-checker` which verifies the
boundary holds in code. This skill explains what the boundary
IS and the test surface it creates.

## When to use

- Designing a new payment integration.
- Auditing existing scope (PAN flowing through your servers?).
- Choosing a gateway / tokenization strategy.
- PR review of payment-related changes.

## SAQ levels (Self-Assessment Questionnaire)

Per [pcisecuritystandards.org](https://www.pcisecuritystandards.org/document_library/):

| SAQ | Description | Scope |
|---|---|---|
| **A** | Card-not-present, fully outsourced (hosted gateway pages, iFrame redirects, Stripe Elements) | Smallest - your servers never see PAN |
| **A-EP** | Hosted-form-with-merchant-customisation (e.g., your domain shows the form but iframe is the gateway's) | Slightly larger; some elements visible to your server |
| **B** | Payment terminals only (POS) | N/A for web-only |
| **C** | Web-based merchants with stored cardholder data | Mostly POS-related |
| **D** | All merchants not covered by A-C; full PCI DSS | Largest - for cases where you must handle PAN |

Choose **A** when feasible. The architecture difference: A
requires that PAN never touches your servers - the customer
inputs it directly into a gateway-hosted iframe / element.

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

Tests for storage:

```sql
-- Detect prohibited PAN patterns
SELECT * FROM <any_table>
WHERE column ~ '^[0-9]{16}$' OR column ~ '^4[0-9]{15}$'
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

The
`qa-compliance/pci-dss-scope-checker` skill runs these
adversarially. This skill provides the catalog.

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

## References

- PCI DSS v4.0 (cite by stable ID):
  [pcisecuritystandards.org/document_library/](https://www.pcisecuritystandards.org/document_library/).
- Stripe Element (scope-reduction):
  [docs.stripe.com/payments/payment-element](https://docs.stripe.com/payments/payment-element).
- Adyen Drop-in:
  [docs.adyen.com/payment-methods/cards/web-drop-in](https://docs.adyen.com/payment-methods/cards/web-drop-in).
- Braintree Hosted Fields:
  [developer.paypal.com/braintree/docs/start/hosted-fields](https://developer.paypal.com/braintree/docs/start/hosted-fields).
- Companion catalogs:
  [`3ds-test-flow-reference`](../3ds-test-flow-reference/SKILL.md),
  [`payment-flow-states-reference`](../payment-flow-states-reference/SKILL.md).
- Adversarial validator (sibling plugin):
  [`qa-compliance/pci-dss-scope-checker`](../../../qa-compliance/skills/pci-dss-scope-checker/SKILL.md).
- Consumed by:
  [`stripe-test-cards-and-webhooks`](../stripe-test-cards-and-webhooks/SKILL.md),
  [`adyen-test-mode`](../adyen-test-mode/SKILL.md),
  [`paypal-sandbox`](../paypal-sandbox/SKILL.md),
  [`braintree-test-cards`](../braintree-test-cards/SKILL.md).
