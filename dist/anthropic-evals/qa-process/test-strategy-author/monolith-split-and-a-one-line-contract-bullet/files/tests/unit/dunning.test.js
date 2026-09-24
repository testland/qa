import test from 'node:test';
import assert from 'node:assert/strict';
import { dueReminders, reminderFor } from '../../src/dunning.js';

const inArrears = {
  async get(service) {
    if (service === 'invoicing') return { id: 'inv_5000', accountId: 'acct_1000' };
    if (service === 'ledger') return { amountCents: -12_000 };
    throw new Error(`no stub for ${service}`);
  },
};

test('selects schedules due at or before now', () => {
  const due = dueReminders([{ nextRun: '2026-03-01' }, { nextRun: '2026-05-01' }], '2026-04-01');
  assert.equal(due.length, 1);
});

test('builds a reminder from the invoice and the account balance', async () => {
  const out = await reminderFor({ invoiceId: 'inv_5000' }, inArrears);
  assert.equal(out.dueCents, 12_000);
});

test('skips an account that is not in arrears', async () => {
  const settled = {
    async get(service) {
      return service === 'invoicing' ? { id: 'inv_1', accountId: 'acct_1001' } : { amountCents: 0 };
    },
  };
  assert.equal(await reminderFor({ invoiceId: 'inv_1' }, settled), null);
});
