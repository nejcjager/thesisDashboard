export type PluralForms = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>

/** Plural picker for one language. Slovenian uses one/two/few/other, English one/other. */
export function plural(locale: string) {
  const rules = new Intl.PluralRules(locale)
  return (n: number, forms: PluralForms) => forms[rules.select(n)] ?? forms.other
}
