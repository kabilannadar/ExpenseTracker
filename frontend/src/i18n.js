import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from './locales/en.json';
import translationHI from './locales/hi.json';
import translationTA from './locales/ta.json';
import translationTE from './locales/te.json';
import translationKN from './locales/kn.json';
import translationML from './locales/ml.json';
import translationMR from './locales/mr.json';
import translationGU from './locales/gu.json';
import translationBN from './locales/bn.json';

const resources = {
  en: { translation: translationEN },
  hi: { translation: translationHI },
  ta: { translation: translationTA },
  te: { translation: translationTE },
  kn: { translation: translationKN },
  ml: { translation: translationML },
  mr: { translation: translationMR },
  gu: { translation: translationGU },
  bn: { translation: translationBN },
};

const savedLanguage = localStorage.getItem('i18nextLng') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
