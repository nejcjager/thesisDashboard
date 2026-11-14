import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dict, getLang, setLang as persistLang, type Dict, type Lang } from './core'

export { dict, getLang, locale, type Dict, type Lang } from './core'

interface I18n {
  lang: Lang
  t: Dict
  setLang: (lang: Lang) => void
}

const Ctx = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setState] = useState<Lang>(getLang)

  useEffect(() => { document.documentElement.lang = lang }, [lang])

  const value = useMemo<I18n>(() => ({
    lang,
    t: dict(lang),
    setLang: l => { persistLang(l); setState(l) },
  }), [lang])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Active dictionary. Components that call it re-render when the language changes. */
export function useT() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useT outside I18nProvider')
  return v
}
