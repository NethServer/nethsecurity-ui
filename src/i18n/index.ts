import { createI18n } from 'vue-i18n'

export async function loadI18n() {
  const locale = navigator.language.substring(0, 2)
  const translations = await loadLanguage(locale)
  const messages: any = {}
  messages[locale] = { ...translations }

  console.log('messages', messages) ////

  const i18n = createI18n({
    legacy: false,
    locale,
    messages
  })
  return i18n
}

export async function loadLanguage(lang: string): Promise<any> {
  try {
    const response = await fetch(`/i18n/${lang}/translation.json`)
    const messages = await response.json()
    return messages
  } catch (error) {
    console.warn(`Cannot import ${lang} language messages`, error)

    // fallback to english
    if (lang !== 'en') {
      console.warn(`Falling back to English`, error)
      return loadLanguage('en')
    }
  }
}
