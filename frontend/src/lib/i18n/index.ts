import { writable, derived } from 'svelte/store';
import en from './en.json';
import es from './es.json';

export type Locale = 'en' | 'es';
export type TranslationKey = string;

const translations = {
  en,
  es
};

// Get stored language or default to 'es'
const storedLocale = typeof localStorage !== 'undefined' ? localStorage.getItem('locale') as Locale : 'es';
const initialLocale: Locale = storedLocale && (storedLocale === 'en' || storedLocale === 'es') ? storedLocale : 'es';

export const locale = writable<Locale>(initialLocale);

// Subscribe to changes and save to localStorage
locale.subscribe((value) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('locale', value);
  }
});

function getValueByPath(obj: any, path: string): string | undefined {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

export const t = derived(locale, ($locale) => (key: TranslationKey, vars: Record<string, any> = {}) => {
  const text = getValueByPath(translations[$locale], key);
  
  if (!text) {
    console.warn(`Translation missing for key: ${key}`);
    return key;
  }

  // Simple variable replacement
  return Object.keys(vars).reduce((acc, v) => {
    return acc.replace(new RegExp(`{${v}}`, 'g'), vars[v]);
  }, text);
});
