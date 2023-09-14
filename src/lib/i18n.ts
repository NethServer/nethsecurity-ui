import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'

export async function loadLocaleMessages(setLocaleMessage: any, lang: string) {
  try {
    const response = await fetch(`/i18n/${lang}/translation.json`)
    const messages = await response.json()
    setLocaleMessage(lang, messages)
    return nextTick()
  } catch (error) {
    console.warn(`Cannot import ${lang} language messages`, error)

    // fallback to english
    if (lang !== 'en') {
      console.warn(`Falling back to English`, error)
      loadLocaleMessages(setLocaleMessage, 'en')
    }
  }
}

export function setupI18n(options: any) {
  const i18n = createI18n(options)
  setI18nLanguage(i18n.global.locale, options.locale)
  return i18n
}

export function setI18nLanguage(localeObj: any, lang: string) {
  localeObj.value = lang

  /**
   * NOTE:
   * If you need to specify the language setting for headers, such as the `fetch` API, set it here.
   * The following is an example for axios.
   *
   * axios.defaults.headers.common['Accept-Language'] = locale
   */

  // @ts-ignore
  document.querySelector('html').setAttribute('lang', localeObj.value)
}
