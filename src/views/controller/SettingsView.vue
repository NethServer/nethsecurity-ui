<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeTitle } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { NeCombobox } from '@nethserver/vue-tailwind-lib'
import { NeButton } from '@nethesis/vue-components'
import { onMounted, ref } from 'vue'
import { useAccountsStore } from '@/stores/controller/accounts'
import { useLanguage } from '@/composables/useLanguage'
import ChangePasswordDrawer from '@/components/controller/account_settings/ChangePasswordDrawer.vue'

const { t } = useI18n()

const { sshKeys, loadSshKeys } = useAccountsStore()

const { uiLanguage, supportedLanguages } = useLanguage()

const showChangePasswordDrawer = ref(false)

onMounted(() => {
  loadSshKeys()
})
</script>

<template>
  <NeTitle>{{ t('controller.account_settings.title') }}</NeTitle>
  <div class="flex max-w-3xl flex-col gap-y-8">
    <FormLayout :title="t('controller.account_settings.change_language')">
      <NeCombobox
        v-model="uiLanguage"
        :label="t('controller.account_settings.language')"
        :options="supportedLanguages"
        :noResultsLabel="t('ne_combobox.no_results')"
        :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
        :noOptionsLabel="t('ne_combobox.no_options_label')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
    /></FormLayout>
    <hr />
    <FormLayout
      :title="t('controller.account_settings.change_password')"
      :description="t('controller.account_settings.change_password_description')"
    >
      <NeButton kind="secondary" @click="showChangePasswordDrawer = true">{{
        t('controller.account_settings.change_password')
      }}</NeButton>
    </FormLayout>
    <hr />
    <FormLayout
      :title="t('controller.account_settings.ssh_key')"
      :description="t('controller.account_settings.ssh_key_description')"
    >
      <template v-if="sshKeys.key"></template>
      <template v-else
        ><NeButton kind="secondary">{{
          t('controller.account_settings.generate_ssh_key_pair')
        }}</NeButton></template
      >
    </FormLayout>
    <hr />
    <FormLayout
      :title="t('controller.account_settings.two_factor_authentication')"
      :description="t('controller.account_settings.two_factor_authentication_description')"
    >
      <div class="mb-4 flex flex-row gap-x-2">
        <FontAwesomeIcon
          :icon="['fas', 'circle-info']"
          class="h-4 w-4 text-indigo-500 dark:text-indigo-300"
        />
        <p>
          {{ t('controller.account_settings.two_factor_authentication_disabled') }}
        </p>
      </div>
      <NeButton kind="secondary">{{ t('controller.account_settings.configure_2fa') }}</NeButton>
    </FormLayout>
  </div>
  <ChangePasswordDrawer
    :is-shown="showChangePasswordDrawer"
    @close="
      () => {
        showChangePasswordDrawer = false
        //TODO: show notification
      }
    "
  />
</template>
