//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { createI18n } from 'vue-i18n'

export async function loadLocaleMessages(setLocaleMessage: any, lang: string): Promise<string> {
  try {
    const response = await fetch(`/i18n/${lang}/translation.json`)
    const messages = await response.json()
    setLocaleMessage(lang, messages)

    if (lang !== 'en') {
      // load english as fallback for missing strings
      const response = await fetch(`/i18n/en/translation.json`)
      const messages = await response.json()
      setLocaleMessage('en', messages)
    }
    return lang
  } catch (error) {
    console.warn(`Cannot import ${lang} language messages`, error)

    // language not supported, fallback to english
    if (lang !== 'en') {
      console.warn(`Falling back to English`)
      return loadLocaleMessages(setLocaleMessage, 'en')
    }
  }
  return ''
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
