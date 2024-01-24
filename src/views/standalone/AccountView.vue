<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeCombobox } from '@nethesis/vue-components'
import { NeTitle, savePreference } from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import ChangePassword from '@/components/standalone/account/ChangePassword.vue'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { onMounted, ref, watch } from 'vue'
import TwoFactorAuth from '@/components/standalone/account/two_fa/TwoFactorAuth.vue'

const { t, locale } = useI18n()
const loginStore = useLoginStore()

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
</script>

<template>
  <NeTitle>{{ t('standalone.account_management.title', { name: loginStore.username }) }}</NeTitle>
  <div class="max-w-3xl space-y-8">
    <FormLayout :title="t('standalone.account_management.ui_language')">
      <NeCombobox
        v-model="uiLanguage"
        :options="supportedLanguages"
        :noResultsLabel="t('ne_combobox.no_results')"
        :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
        :noOptionsLabel="t('standalone.dpi.no_interfaces_available')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
        :optionalLabel="t('common.optional')"
      />
    </FormLayout>
    <!-- divider -->
    <div class="border-b border-gray-200 dark:border-gray-700"></div>
    <FormLayout
      :title="t('standalone.account_management.change_password')"
      :description="t('standalone.account_management.change_password_description')"
    >
      <ChangePassword />
    </FormLayout>
    <!-- divider -->
    <div class="border-b border-gray-200 dark:border-gray-700"></div>
    <FormLayout
      :title="t('standalone.two_fa.title')"
      :description="t('standalone.two_fa.description')"
    >
      <TwoFactorAuth />
    </FormLayout>
  </div>
</template>
