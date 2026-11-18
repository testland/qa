# Pseudo-localization breaks interpolation in our i18next app

## Problem Description

Our pseudo-localization for i18next (`src/i18n.ts`) breaks interpolation (`docs/notes.md`) and doesn't find much. Fix it, and list the localization bugs it should expose in `src/Header.tsx` and `locales/en.json`.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: src/i18n.ts ===============
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';

const ACCENTS: Record<string, string> = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', c: 'ç', n: 'ñ', t: 'ţ' };

i18next.use(initReactI18next).use({
  type: 'postProcessor',
  name: 'pseudo',
  process: (value: string) => value.replace(/[a-z]/g, (ch) => ACCENTS[ch] ?? ch),
}).init({
  lng: process.env.PSEUDO ? 'en' : 'en',
  resources: { en: { translation: en } },
  postProcess: process.env.PSEUDO ? ['pseudo'] : [],
});
export default i18next;

=============== FILE: locales/en.json ===============
{
  "cart_title": "Your cart",
  "items": "{{count}} item(s)",
  "terms": "I accept the <1>terms of service</1>",
  "greeting": "Hello"
}

=============== FILE: src/Header.tsx ===============
import { useTranslation } from 'react-i18next';
export function Header({ user, count }: { user: { name: string }; count: number }) {
  const { t } = useTranslation();
  return (
    <header>
      <h1>{t('cart_title')}</h1>
      <span className="badge">{t('items', { count })}</span>
      <p>{t('greeting') + ', ' + user.name + '!'}</p>
      <button>Checkout</button>
    </header>
  );
}

=============== FILE: docs/notes.md ===============
With PSEUDO=1 the badge shows `{{çóúñţ}} íţém(s)` and the Terms link disappears.
