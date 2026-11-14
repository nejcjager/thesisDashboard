import { sl, type Dict } from './sl'
import { en } from './en'

export type Lang = 'sl' | 'en'
export type { Dict }

const dicts: Record<Lang, Dict> = { sl, en }
const locales: Record<Lang, string> = { sl: 'sl-SI', en: 'en-GB' }
const KEY = 'lang'

function stored(): Lang {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'en' ? 'en' : 'sl'
  } catch {
    return 'sl'
  }
}

// Module-level so plain helpers (errorText, hm, weekLabel) can read it without React.
let current: Lang = stored()

export const getLang = () => current
export const locale = () => locales[current]
export const dict = (lang: Lang = current) => dicts[lang]

/** Switch language and remember it in this browser. React re-renders via I18nProvider. */
export function setLang(lang: Lang) {
  current = lang
  try { localStorage.setItem(KEY, lang) } catch { /* storage blocked */ }
  if (typeof document !== 'undefined') document.documentElement.lang = lang
}
