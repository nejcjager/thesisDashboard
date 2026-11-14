import { useT, type Lang } from '../lib/i18n'

const LANGS: Lang[] = ['sl', 'en']

/** SL | EN toggle. The choice is kept in this browser (see lib/i18n/core.ts). */
export function LangSwitch() {
  const { t, lang, setLang } = useT()
  return (
    <div className="lang-switch" role="group" aria-label={t.lang.label}>
      {LANGS.map(l => (
        <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
