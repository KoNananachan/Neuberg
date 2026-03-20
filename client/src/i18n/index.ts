import { useAppStore } from '../stores/use-app-store';
import { translations, type TranslationKey, type Locale } from './translations';

export type { Locale, TranslationKey };
export { LOCALE_LABELS } from './translations';

export function useT() {
  const locale = useAppStore((s) => s.locale);
  return (key: TranslationKey): string => translations[locale]?.[key] ?? translations.en[key];
}

export type TFn = ReturnType<typeof useT>;

export function tr(t: TFn, key: string, fallback: string): string {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
}
