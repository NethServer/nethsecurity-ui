import { isStandaloneMode } from '@/lib/config'
import { useLoginStore as useControllerLoginStore } from '@/stores/controller/controllerLogin'
import { useLoginStore as useStandaloneLoginStore } from '@/stores/standalone/standaloneLogin'
import { savePreference } from '@nethesis/vue-components'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

export function useLanguage() {
  const { locale } = useI18n()

  const loginStore = isStandaloneMode() ? useStandaloneLoginStore() : useControllerLoginStore()

  const uiLanguage = ref('')
  const supportedLanguages = [
    { id: 'en', label: 'English' },
    { id: 'it', label: 'Italiano' }
  ]

  watch(uiLanguage, (newValue, oldValue) => {
    // don't change locale on first load
    if (oldValue && newValue) {
      changeLocale(uiLanguage.value)
    }
  })

  onMounted(() => {
    uiLanguage.value = locale.value
  })

  async function changeLocale(lang: string) {
    savePreference('locale', lang, loginStore.username)

    // reload page
    location.reload()
  }

  return { uiLanguage, supportedLanguages }
}
