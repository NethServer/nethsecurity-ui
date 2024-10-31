<script lang="ts" setup>
import { NeCombobox, type NeComboboxOption, savePreference } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { computed, watch } from 'vue'
import { isStandaloneMode } from '@/lib/config'
import { useLoginStore as useStandaloneLoginStore } from '@/stores/standalone/standaloneLogin'
import { useLoginStore as useControllerLoginStore } from '@/stores/controller/controllerLogin'

const { t, locale, availableLocales } = useI18n({ useScope: 'global' })
const loginStore = isStandaloneMode() ? useStandaloneLoginStore() : useControllerLoginStore()

const supportedLanguages = computed((): NeComboboxOption[] => {
  return availableLocales.map((locale) => {
    return {
      id: locale,
      label: t(`languages.${locale}`)
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
    :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
    :noOptionsLabel="t('ne_combobox.dpi.no_options_label')"
    :noResultsLabel="t('ne_combobox.no_results')"
    :optionalLabel="t('common.optional')"
    :options="supportedLanguages"
    :selected-label="t('ne_combobox.selected')"
    :user-input-label="t('ne_combobox.user_input_label')"
  />
</template>
