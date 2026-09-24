import { test as base, expect } from '@playwright/test';
import { createAccount, deleteAccount, signIn } from './api';
import type { Account, Session } from './types';

export const test = base.extend<object, { account: Account; session: Session }>({
  account: [
    async ({}, use) => {
      const account = await createAccount({ plan: 'starter', creditCents: 500000 });
      await use(account);
      await deleteAccount(account.id);
    },
    { scope: 'worker' },
  ],

  session: [
    async ({ account }, use) => {
      await use(await signIn(account.ownerEmail));
    },
    { scope: 'worker' },
  ],
});

export { expect };
