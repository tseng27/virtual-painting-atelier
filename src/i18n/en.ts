import type { I18nKey } from './zh-TW';

/** English locale scaffold — untranslated keys fall back to zh-TW. */
export const en: Partial<Record<I18nKey, string>> = {
  'app.tagline': 'Virtual Painting Studio',
  'home.start': 'Start painting',
  'home.continue': 'Continue last work',
  'home.gallery': 'My works',
  'home.help': 'Guide',
};
