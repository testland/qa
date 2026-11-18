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
