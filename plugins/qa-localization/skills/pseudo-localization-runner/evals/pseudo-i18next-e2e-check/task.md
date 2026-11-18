# Our pseudo-localization check never fails

## Problem Description

Our pseudo-localization Playwright check never fails, even though translators keep finding hardcoded English (`src/i18n.ts`, `e2e/pseudo.spec.ts`, `docs/translator-report.md`). Make the check catch these problems automatically.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: src/i18n.ts ===============
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import Pseudo from 'i18next-pseudo';
import en from '../locales/en.json';

i18n
  .use(LanguageDetector)
  .use(new Pseudo({ enabled: import.meta.env.DEV }))
  .use(initReactI18next)
  .init({ resources: { en: { translation: en } }, fallbackLng: 'en' });

export default i18n;

=============== FILE: e2e/pseudo.spec.ts ===============
import { test, expect } from '@playwright/test';

test.use({ extraHTTPHeaders: { 'Accept-Language': 'en-XA' } });

test('orders page under pseudo-locale', async ({ page }) => {
  await page.goto('/orders');
  await expect(page).toHaveScreenshot('orders-pseudo.png', { maxDiffPixelRatio: 0.05 });
});

=============== FILE: docs/translator-report.md ===============
The German pilot found English left on /orders: the search box placeholder "Search orders", the close button's
screen-reader label "Close", the page title in the browser tab, and a toast "Order " + id + " cancelled".
Our pseudo-loc job has been green for months and its screenshots show plain English.
