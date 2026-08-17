import { test, expect } from '@playwright/test';
import { buildInvoice } from '../../src/billing/buildInvoice';

// flaky in CI sometimes, just retry if it goes red - see #4412
test('totals a multi-line invoice', async () => {
  const invoice = buildInvoice([
    { description: 'Seat', qtyCents: 9900, taxRate: 0.2 },
    { description: 'Support', qtyCents: 2100, taxRate: 0.2 },
  ]);
  expect(invoice).toEqual({ currency: 'EUR', totalCents: 14400 });
});
