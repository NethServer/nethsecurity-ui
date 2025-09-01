<script lang="ts" setup>
import { NeCombobox, type NeComboboxOption, savePreference } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { computed, watch } from 'vue'
import { isStandaloneMode } from '@/lib/config'
import { useLoginStore as useStandaloneLoginStore } from '@/stores/standalone/standaloneLogin'
import { useLoginStore as useControllerLoginStore } from '@/stores/controller/controllerLogin'
import { capitalize } from 'lodash-es'

const { t, locale, availableLocales } = useI18n({ useScope: 'global' })
const loginStore = isStandaloneMode() ? useStandaloneLoginStore() : useControllerLoginStore()

const supportedLanguages = computed((): NeComboboxOption[] => {
  return availableLocales.map((locale) => {
    const intl = new Intl.DisplayNames([locale], { type: 'language', fallback: 'code' })
    // translated is always found and a string due to the fallback option: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames/DisplayNames#fallback
    const translated = intl.of(locale)!
    return {
      id: locale,
      label: capitalize(translated)
    }
  })
})

watch(locale, () => {
  savePreference('locale', locale.value, loginStore.username)
})
</script>

<template>
  <NeCombobox
    v-model="locale"
    :limited-options-label="t('ne_combobox.limited_options_label')"
    :no-options-label="t('ne_combobox.dpi.no_options_label')"
    :no-results-label="t('ne_combobox.no_results')"
    :optional-label="t('common.optional')"
    :options="supportedLanguages"
    :selected-label="t('ne_combobox.selected')"
    :user-input-label="t('ne_combobox.user_input_label')"
  />
</template>
