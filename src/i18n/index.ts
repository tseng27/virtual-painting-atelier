import { zhTW, type I18nKey } from './zh-TW';
import { en } from './en';

export type Locale = 'zh-TW' | 'en';
let locale: Locale = 'zh-TW';
export const setLocale = (l: Locale) => { locale = l; };
export const getLocale = () => locale;

export function t(key: I18nKey | string, vars?: Record<string, string | number>): string {
  const dict = locale === 'en' ? en : zhTW;
  let s = (dict as Record<string, string>)[key] ?? (zhTW as Record<string, string>)[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
export type { I18nKey };
