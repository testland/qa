# Every test signs in through the form before it can start

## Problem Description

We have about sixty specs and every one of them starts by driving the sign-in
form: type the email, type the password, submit, wait for the dashboard. That is
roughly nine seconds per test and it is now the largest single line item in our
twenty-two minute suite.

It is also our biggest source of noise. When the auth service is slow for thirty
seconds, every test in the run fails, not just the tests that are about signing
in, and the report gives us sixty red rows that all mean the same thing.

Two roles are involved. `tests/billing.spec.ts` needs an account with admin
rights; `tests/dashboard.spec.ts` needs an ordinary member. Today each file
hard-codes its own credentials into its own `beforeEach`.

One spec genuinely has to keep driving the form: `tests/login.spec.ts` is the
test of the sign-in form itself. If it starts from an already-signed-in browser
it stops testing anything.

## Output Specification

1. Establish the signed-in browser state once per role for the whole run, so a
   test that merely needs to be signed in starts out signed in and never touches
   the form.
2. Wire that up so it happens automatically before the specs run, ordered by the
   configuration rather than by each spec file remembering to do something
   first.
3. Convert `tests/dashboard.spec.ts` (member) and `tests/billing.spec.ts`
   (admin) to consume it. Their existing assertions must survive unchanged.
4. `tests/login.spec.ts` must still exercise the real form and must start from a
   browser with no existing session, even though the rest of the suite does not.
5. Whatever files the saved state is written into must not end up in version
   control. Update `.gitignore` accordingly.

Credentials may keep coming from the same literals used today.

## Input Files

Extract the following files before beginning.

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});

=============== FILE: tests/dashboard.spec.ts ===============
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Email').fill('member@example.com');
  await page.getByLabel('Password').fill('member-password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});

test('lists the projects the member belongs to', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('listitem')).toHaveCount(3);
  await expect(page.getByText('Apollo')).toBeVisible();
});

test('opens a project from the recent list', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Apollo' }).click();
  await expect(page.getByRole('heading', { name: 'Apollo' })).toBeVisible();
});

=============== FILE: tests/billing.spec.ts ===============
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('admin-password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});

test('shows the current plan', async ({ page }) => {
  await page.goto('/billing');
  await expect(page.getByText('Team plan')).toBeVisible();
});

test('lets an admin download an invoice', async ({ page }) => {
  await page.goto('/billing');
  await expect(page.getByRole('button', { name: /download invoice/i })).toBeEnabled();
});

=============== FILE: tests/login.spec.ts ===============
import { test, expect } from '@playwright/test';

test('rejects a bad password', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Email').fill('member@example.com');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('alert')).toHaveText(/incorrect password/i);
});

test('sends an unauthenticated visitor to the form', async ({ page }) => {
  await page.goto('/billing');
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
});

=============== FILE: .gitignore ===============
node_modules/
test-results/
playwright-report/
