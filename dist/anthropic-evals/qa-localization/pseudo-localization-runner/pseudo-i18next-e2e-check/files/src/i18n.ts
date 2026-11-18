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
