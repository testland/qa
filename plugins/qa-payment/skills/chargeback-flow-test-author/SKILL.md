---
name: chargeback-flow-test-author
description: "Workflow-driven skill that builds the chargeback / dispute test suite. Covers the canonical reason codes (Visa CB Reason Code 10.4 fraud / 13.1 services not provided; Mastercard MCC 4855; per-network code lookups), the per-gateway dispute API (Stripe Disputes; Adyen Chargeback notifications; PayPal Disputes API), the merchant-evidence-submission flow + window, the auto-evidence-collection patterns, and the disposition outcomes (won / lost / accepted). Use when designing dispute coverage."
---

# chargeback-flow-test-author

## Overview

A chargeback (also: dispute) is a customer-initiated reversal of
a settled transaction. The merchant has a fixed window (typically
7-30 days) to submit evidence. Outcomes: merchant wins (funds
retained) or loses (funds + chargeback fee deducted).

Per [stripe.com/docs/disputes](https://docs.stripe.com/disputes):
"Disputes (also known as chargebacks) start when a cardholder
questions a payment with their card issuer." Visa, Mastercard,
AmEx each maintain their own reason-code catalogs.

## When to use

- Designing dispute test coverage for a new integration.
- Auditing existing dispute-evidence-submission code.
- Building dispute analytics dashboards.

## Step 1 - Reason code catalog

Per Visa Chargeback Reason Codes (cite by stable ID: Visa
Chargeback Management Guidelines):

| Code | Category | Description |
|---|---|---|
| 10.4 | Fraud | "Card-absent environment fraud" |
| 11.1 | Authorization | Card recovery bulletin |
| 11.2 | Authorization | Declined authorization |
| 11.3 | Authorization | No authorization |
| 12.1 | Processing errors | Late presentment |
| 12.2 | Processing errors | Incorrect transaction code |
| 12.3 | Processing errors | Incorrect currency |
| 12.4 | Processing errors | Incorrect account number |
| 13.1 | Consumer disputes | Merchandise/services not received |
| 13.2 | Consumer disputes | Cancelled recurring transaction |
| 13.3 | Consumer disputes | Not as described |
| 13.5 | Consumer disputes | Misrepresentation |

Per Mastercard MCC chargeback reason codes (cite by stable ID:
Mastercard Chargeback Guide):

| Code | Description |
|---|---|
| 4853 | Cardholder disputes |
| 4855 | Non-receipt of merchandise |
| 4859 | Services not rendered |
| 4863 | Cardholder doesn't recognize |

For tests: pick the 3-5 most-common reason codes for your
business and verify the evidence-collection flow for each.

## Step 2 - Per-gateway dispute API

### Stripe

Per [stripe.com/docs/disputes](https://docs.stripe.com/disputes):
the `dispute` object has a `status` field (`needs_response`,
`under_review`, `won`, `lost`, `warning_*`).

Test mode:

```typescript
// Create a disputable charge
const charge = await stripe.paymentIntents.create({
  amount: 1000, currency: 'usd',
  payment_method: 'pm_card_createDispute',  // Special test method
  confirm: true, return_url: 'https://example.com/return',
});

// Wait for the dispute event via webhook
// Or fetch directly
const disputes = await stripe.disputes.list({ payment_intent: charge.id });
expect(disputes.data[0].status).toBe('needs_response');
expect(disputes.data[0].reason).toBe('fraudulent');
```

Per Stripe testing docs, special payment methods trigger disputes
in test mode.

### Adyen

Per [docs.adyen.com/risk-management/disputes-api](https://docs.adyen.com/risk-management/disputes-api):
Adyen sends `[CHARGEBACK]` notifications.

```typescript
// Simulate via test mode + webhook
const dispute = await disputesApi.acceptDispute({
  disputePspReference: 'test-dispute-ref',
  merchantAccountCode: process.env.ADYEN_MERCHANT_ACCOUNT,
});
```

### PayPal Disputes API

Per [developer.paypal.com/docs/api/customer-disputes/v1](https://developer.paypal.com/docs/api/customer-disputes/v1/):

```typescript
const dispute = await disputesClient.get(disputeId);
expect(dispute.status).toBe('OPEN');
```

## Step 3 - Submit evidence

Per [stripe.com/docs/disputes/responding](https://docs.stripe.com/disputes/responding):

```typescript
test('submit dispute evidence', async () => {
  const dispute = disputes.data[0];
  const result = await stripe.disputes.update(dispute.id, {
    evidence: {
      product_description: 'Premium subscription month 5',
      service_documentation: fileUploadId,  // FileUpload object
      shipping_documentation: shippingFileId,
      customer_email_address: 'user@example.com',
      customer_purchase_ip: '203.0.113.1',
      receipt: receiptFileId,
    },
  });
  expect(result.evidence_details.has_evidence).toBe(true);
});
```

The evidence must be submitted **before the due date**
(`evidence_details.due_by`).

## Step 4 - Test the disposition flow

```typescript
test('won disputes update internal state', async () => {
  // Trigger via test mode
  const dispute = await createTestDispute({ reason: 'product_not_received' });
  await submitWinningEvidence(dispute.id);

  // In Stripe test mode, certain evidence text wins the dispute
  await waitForWebhook('charge.dispute.closed', { matching: { id: dispute.id } });

  const final = await stripe.disputes.retrieve(dispute.id);
  expect(final.status).toBe('won');
  expect(final.amount).toBe(0);  // No funds deducted
});

test('lost disputes update internal state', async () => {
  const dispute = await createTestDispute({});
  // Don't submit evidence; let it expire
  await skipPastDueDate(dispute);

  await waitForWebhook('charge.dispute.closed');
  const final = await stripe.disputes.retrieve(dispute.id);
  expect(final.status).toBe('lost');
});
```

## Step 5 - Auto-evidence collection

Many merchants auto-collect evidence on every charge - purchase
description, shipping info, customer IP - to streamline disputes.
Tests should verify:

```typescript
test('every charge has auto-evidence', async () => {
  const intent = await createSucceededIntent({...});
  const evidence = await loadEvidenceForCharge(intent.charges.data[0].id);
  expect(evidence).toMatchObject({
    customer_email_address: expect.any(String),
    customer_purchase_ip: expect.any(String),
    receipt_url: expect.any(String),
  });
});
```

## Step 6 - Test matrix

```yaml
# tests/payment/chargeback-matrix.yaml
matrix:
  reason_codes:
    - "Visa 10.4 - fraud"
    - "Visa 13.1 - services not provided"
    - "Mastercard 4855 - non-receipt"
  gateways:
    - stripe
    - adyen
    - paypal
  outcomes:
    - won-with-evidence
    - lost-no-response
    - accepted
```

Per (gateway, reason, outcome) cell, generate a test.

## Step 7 - Reconciliation

Chargebacks affect accounting:

```typescript
test('lost dispute reverses funds in ledger', async () => {
  const intent = await createSucceededIntent({ amount: 1000 });
  const dispute = await triggerLostDispute(intent);
  await waitForChargebackEvent();

  const ledger = await getLedgerEntries(intent.id);
  expect(ledger).toContainEqual(expect.objectContaining({ type: 'charge', amount: 1000 }));
  expect(ledger).toContainEqual(expect.objectContaining({ type: 'chargeback', amount: -1000 }));
  expect(ledger).toContainEqual(expect.objectContaining({ type: 'chargeback_fee' }));
});
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip dispute tests | "Won't happen often" but worst-case impact is high | Always cover |
| Hand-coded evidence submission | Schema drift; missed fields | Use gateway SDK helpers |
| No due-date tracking | Evidence submitted late → auto-lose | Test the due-date watcher |
| Test only one reason code | Each reason has different evidence requirements | Cover top 3-5 |
| Mock the dispute object | Loses gateway-side state transitions | Use test-mode dispute triggers |
| Skip chargeback-fee reconciliation | Books don't match | Test the ledger |
| No webhook handling for `charge.dispute.closed` | Final state unknown | Webhook-driven |
| Hardcoded "$15 chargeback fee" | Per-gateway, per-region; varies | Read from gateway response |

## Limitations

- **Real chargebacks take weeks.** Test mode collapses the
  timeline; production verification needs production traffic.
- **Reason codes change.** Visa / Mastercard publish updates;
  test data goes stale annually.
- **Bank-side evidence review** isn't fully testable.
- **Per-jurisdiction rules.** EU has stronger consumer protection;
  US has different.

## References

- Stripe Disputes:
  [docs.stripe.com/disputes](https://docs.stripe.com/disputes).
- Stripe Disputes test cards:
  [docs.stripe.com/testing#disputes](https://docs.stripe.com/testing#disputes).
- Adyen Chargeback API:
  [docs.adyen.com/risk-management/disputes-api](https://docs.adyen.com/risk-management/disputes-api).
- PayPal Customer Disputes:
  [developer.paypal.com/docs/api/customer-disputes/v1/](https://developer.paypal.com/docs/api/customer-disputes/v1/).
- Visa Chargeback Reason Codes (cite by stable ID: Visa Chargeback Management Guidelines).
- Mastercard Chargeback Guide (cite by stable ID).
- Companion catalog:
  `payment-flow-states-reference`.
- Per-platform SDKs:
  `stripe-test-cards-and-webhooks`,
  `adyen-test-mode`,
  `paypal-sandbox`,
  `braintree-test-cards`.
- Sibling builders:
  `refund-test-matrix-builder`,
  `payment-webhook-replay`.
