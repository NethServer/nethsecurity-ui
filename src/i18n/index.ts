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
