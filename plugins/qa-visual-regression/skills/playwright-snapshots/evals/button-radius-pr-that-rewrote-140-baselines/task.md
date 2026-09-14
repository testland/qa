# One token change, 140 baseline PNGs, forty minutes before the train

## Problem Description

I am the reviewer on PR #5311 and the release train leaves at 16:00. The source
change is one property in one file: our button corner radius goes from 4px to
8px, signed off by design in FIG-882 on 2026-09-07. Riding along with it are 140
baseline PNG files that our update job produced when Dan pushed the `revisual`
label onto the PR.

Ana, who runs the web guild, has already told me in Slack to take the whole
thing as a block - "it is one token, the diffs are corners, we are not spending
a reviewer afternoon on 140 images." Dan agrees, and his cleanup plan if I do
push back is to rebase on `main` and let the update job run again, which he says
will "settle the file list down."

I would rather be told plainly that block approval is fine than be handed
homework, but I have been burned on this branch before and I want the reasoning
shown. I cannot open the images - the artifact retention expired - so what I
have is the file-status list from the diff, the config, the branch history, the
update workflow, the source files, and the open bug board.

Give me a verdict per group of baseline files with the evidence behind it, the
exact commands Dan should run, and one change that stops the next token-sized PR
arriving in this shape.

## Output Specification

1. Write `docs/visual-review-5311.md`: one verdict per group of baseline files,
   the evidence for each, ordered so the group that matters most is first.
2. Give Dan the exact command or commands, and say precisely which files come
   off the branch.
3. Name the one change to the update workflow or config that prevents a repeat.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/pr-5311.md ===============
# PR #5311 - button radius 4px -> 8px

Design sign-off: FIG-882 (2026-09-07, @jlind).
Source diff: `src/tokens.css`, one line.

Labels: `design-token`, `revisual`

@dprice: pushed `revisual` at 09:12, job 8841 came back green at 09:31 and
pushed the baselines onto the branch. 140 files. Ready when you are.

@amalone: take it as a block please. One token, corner pixels, no reviewer
afternoon. If the file count bothers anyone, rebase and re-label and it settles
down.

@bhaddad: reminder that the PR check is still chromium only while the other two
engines bed in - see `visual.yml`. The refresh job does not filter.

=============== FILE: src/tokens.css ===============
:root {
  --radius-button: 8px;
  --radius-card: 12px;
  --radius-input: 6px;
  --color-accent: #2f6bff;
  --space-gutter: 24px;
}

.btn {
  border-radius: var(--radius-button);
  padding: 8px 16px;
  background: var(--color-accent);
}

.card {
  border-radius: var(--radius-card);
}

=============== FILE: src/emails/inline.css ===============
/* Inlined at send time by the transactional renderer. */
.email-btn {
  border-radius: 4px;
  padding: 10px 18px;
  background: #2f6bff;
}

.email-header {
  padding: 20px 28px;
  background: #0b1220;
}

.email-card {
  border-radius: 12px;
}

=============== FILE: reports/changed-baselines.txt ===============
$ git diff --name-status main...HEAD -- '*-snapshots/*'
M	tests/buttons.spec.ts-snapshots/primary-default-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/primary-hover-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/primary-focus-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/primary-disabled-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/primary-loading-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/secondary-default-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/secondary-hover-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/secondary-focus-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/secondary-disabled-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/ghost-default-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/ghost-hover-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/ghost-disabled-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/danger-default-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/danger-hover-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/danger-disabled-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/icon-only-sm-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/icon-only-md-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/icon-only-lg-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/split-default-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/split-open-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/group-two-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/group-three-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/toolbar-row-1-chromium-linux.png
M	tests/buttons.spec.ts-snapshots/toolbar-wrap-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/cart-empty-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/cart-one-line-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/cart-many-lines-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/shipping-form-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/shipping-error-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/payment-card-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/payment-wallet-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/payment-error-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/review-step-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/review-promo-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/confirm-success-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/confirm-pending-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/coupon-open-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/coupon-applied-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/coupon-rejected-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/address-book-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/address-new-1-chromium-linux.png
M	tests/checkout.spec.ts-snapshots/address-edit-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/profile-view-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/profile-edit-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/security-view-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/security-2fa-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/security-keys-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/billing-plan-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/billing-invoices-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/billing-card-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/notifications-email-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/notifications-push-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/team-list-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/team-invite-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/team-roles-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/api-keys-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/api-new-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/webhooks-list-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/webhooks-edit-1-chromium-linux.png
M	tests/settings.spec.ts-snapshots/danger-zone-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/welcome-plain-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/welcome-rich-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/invite-plain-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/invite-rich-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/receipt-one-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/receipt-many-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/receipt-refund-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/password-reset-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/password-changed-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/digest-daily-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/digest-weekly-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/digest-empty-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/alert-quota-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/alert-billing-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/alert-security-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/onboarding-1-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/onboarding-2-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/onboarding-3-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/onboarding-4-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/winback-30-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/winback-60-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/winback-90-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/trial-start-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/trial-mid-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/trial-end-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/seat-added-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/seat-removed-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/export-ready-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/export-failed-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/report-monthly-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/report-quarterly-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/footer-eu-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/footer-us-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/header-light-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/header-dark-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/cta-single-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/cta-double-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/legal-block-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/unsub-block-1-chromium-linux.png
M	tests/emails.spec.ts-snapshots/preview-text-1-chromium-linux.png
A	tests/buttons.spec.ts-snapshots/primary-default-1-firefox-linux.png
A	tests/buttons.spec.ts-snapshots/primary-hover-1-firefox-linux.png
A	tests/buttons.spec.ts-snapshots/primary-disabled-1-firefox-linux.png
A	tests/buttons.spec.ts-snapshots/secondary-default-1-firefox-linux.png
A	tests/buttons.spec.ts-snapshots/secondary-hover-1-firefox-linux.png
A	tests/buttons.spec.ts-snapshots/ghost-default-1-firefox-linux.png
A	tests/buttons.spec.ts-snapshots/danger-default-1-firefox-linux.png
A	tests/buttons.spec.ts-snapshots/icon-only-md-1-firefox-linux.png
A	tests/buttons.spec.ts-snapshots/split-default-1-firefox-linux.png
A	tests/buttons.spec.ts-snapshots/group-two-1-firefox-linux.png
A	tests/buttons.spec.ts-snapshots/toolbar-row-1-firefox-linux.png
A	tests/buttons.spec.ts-snapshots/primary-default-1-webkit-linux.png
A	tests/buttons.spec.ts-snapshots/primary-hover-1-webkit-linux.png
A	tests/buttons.spec.ts-snapshots/primary-disabled-1-webkit-linux.png
A	tests/buttons.spec.ts-snapshots/secondary-default-1-webkit-linux.png
A	tests/buttons.spec.ts-snapshots/secondary-hover-1-webkit-linux.png
A	tests/buttons.spec.ts-snapshots/ghost-default-1-webkit-linux.png
A	tests/buttons.spec.ts-snapshots/danger-default-1-webkit-linux.png
A	tests/buttons.spec.ts-snapshots/icon-only-md-1-webkit-linux.png
A	tests/buttons.spec.ts-snapshots/split-default-1-webkit-linux.png
A	tests/buttons.spec.ts-snapshots/group-two-1-webkit-linux.png
A	tests/buttons.spec.ts-snapshots/toolbar-row-1-webkit-linux.png
A	tests/checkout.spec.ts-snapshots/cart-empty-1-firefox-linux.png
A	tests/checkout.spec.ts-snapshots/cart-one-line-1-firefox-linux.png
A	tests/checkout.spec.ts-snapshots/shipping-form-1-firefox-linux.png
A	tests/checkout.spec.ts-snapshots/payment-card-1-firefox-linux.png
A	tests/checkout.spec.ts-snapshots/review-step-1-firefox-linux.png
A	tests/checkout.spec.ts-snapshots/confirm-success-1-firefox-linux.png
A	tests/checkout.spec.ts-snapshots/coupon-open-1-firefox-linux.png
A	tests/checkout.spec.ts-snapshots/address-book-1-firefox-linux.png
A	tests/checkout.spec.ts-snapshots/address-new-1-firefox-linux.png
A	tests/checkout.spec.ts-snapshots/cart-empty-1-webkit-linux.png
A	tests/checkout.spec.ts-snapshots/cart-one-line-1-webkit-linux.png
A	tests/checkout.spec.ts-snapshots/shipping-form-1-webkit-linux.png
A	tests/checkout.spec.ts-snapshots/payment-card-1-webkit-linux.png
A	tests/checkout.spec.ts-snapshots/review-step-1-webkit-linux.png
A	tests/checkout.spec.ts-snapshots/confirm-success-1-webkit-linux.png
A	tests/checkout.spec.ts-snapshots/coupon-open-1-webkit-linux.png
A	tests/checkout.spec.ts-snapshots/address-book-1-webkit-linux.png
A	tests/checkout.spec.ts-snapshots/address-new-1-webkit-linux.png

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  retries: 1,
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 120,
      threshold: 0.2,
      animations: 'disabled',
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});

=============== FILE: docs/branch-log.md ===============
$ git log --oneline --graph --decorate main...HEAD

*   9b41c07 (HEAD -> feat/button-radius) Merge branch 'feat/email-header-refresh'
|\
| * 41ea88d refresh transactional email header padding and dark variant
| * 2c70d19 move email header markup into a partial
* | e0a9d61 chore(visual): baselines from job 8841
* | 77bc3f2 tokens: button radius 4px -> 8px
|/
* 6d52aa1 (main) ci: add firefox and webkit projects to the visual job
* 1f0ee54 (main) deps: playwright 1.47.2 -> 1.48.0
* a03ccb4 (main) fix(cart): keep promo row height stable when coupon rejected

$ git log --oneline -1 --date=short --format='%h %ad %s' 6d52aa1
6d52aa1 2026-09-02 ci: add firefox and webkit projects to the visual job

=============== FILE: .github/workflows/visual-update.yml ===============
name: visual-update

on:
  pull_request:
    types: [labeled]

jobs:
  rebaseline:
    if: github.event.label.name == 'revisual'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          ref: ${{ github.head_ref }}

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Refresh baselines
        run: npx playwright test --update-snapshots

      - name: Commit
        run: |
          git config user.name  "visual-bot"
          git config user.email "visual-bot@example.com"
          git add -A
          git commit -m "chore(visual): baselines from job ${{ github.run_id }}"
          git push

=============== FILE: .github/workflows/visual.yml ===============
name: visual

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npx playwright install --with-deps chromium

      - name: Run visual checks
        run: npx playwright test --project=chromium

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14

=============== FILE: docs/bug-board.md ===============
# Web bugs - open, as of 2026-09-12

| Id       | Title                                                      | State  | Opened     | Owner        |
|----------|------------------------------------------------------------|--------|------------|--------------|
| WEB-1180 | Nav items wrap to a second line in Firefox at 1280 wide     | open   | 2026-09-04 | @web-platform|
| WEB-1174 | Coupon rejection shifts the promo row by 2px                | fixed  | 2026-08-28 | @checkout    |
| WEB-1169 | Settings sidebar scrollbar overlaps the API key column      | open   | 2026-08-22 | @platform-ui |
| WEB-1155 | Webkit renders the danger button label 1px lower            | open   | 2026-08-11 | @web-platform|
| WEB-1142 | Email dark-variant header reads black-on-black in Outlook   | open   | 2026-07-30 | @growth      |

Notes from the 2026-09-10 triage: WEB-1180 reproduces on every Firefox run on
`main` and on every branch cut from it. Nobody is on it. WEB-1155 reproduces on
Webkit only. Both were opened from manual passes, not from the visual job.

=============== FILE: tools/baseline-paths.mjs ===============
// Groups a `git diff --name-status` listing by the spec directory a baseline
// belongs to. Reporting helper only - it does not read or write PNGs.

export function parseNameStatus(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[A-Z]\t?\s/.test(line) || /^[A-Z]\s+\S/.test(line))
    .map((line) => {
      const [status, path] = line.split(/\s+/, 2);
      return { status, path };
    })
    .filter((e) => e.path && e.path.endsWith('.png'));
}

export function groupBySpecDir(entries) {
  const out = new Map();
  for (const e of entries) {
    const dir = e.path.split('/').slice(0, -1).join('/');
    if (!out.has(dir)) out.set(dir, []);
    out.get(dir).push(e);
  }
  return out;
}

=============== FILE: tools/baseline-paths.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNameStatus, groupBySpecDir } from './baseline-paths.mjs';

const SAMPLE = [
  'M\ttests/a.spec.ts-snapshots/one-1-chromium-linux.png',
  'A\ttests/a.spec.ts-snapshots/two-1-firefox-linux.png',
  'M\ttests/b.spec.ts-snapshots/three-1-chromium-linux.png',
  'M\tsrc/tokens.css',
].join('\n');

test('parses only png rows', () => {
  const entries = parseNameStatus(SAMPLE);
  assert.equal(entries.length, 3);
  assert.equal(entries[0].status, 'M');
});

test('groups by spec directory', () => {
  const grouped = groupBySpecDir(parseNameStatus(SAMPLE));
  assert.equal(grouped.size, 2);
  assert.equal(grouped.get('tests/a.spec.ts-snapshots').length, 2);
});
