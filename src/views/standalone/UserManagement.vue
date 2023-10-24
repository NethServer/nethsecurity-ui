<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeButton, NeTitle, savePreference } from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import ChangePassword from '@/components/standalone/account/ChangePassword.vue'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import FormLayout from '@/components/standalone/FormLayout.vue'

const { t } = useI18n()

const loginStore = useLoginStore()

async function changeLocale(lang: string) {
  savePreference('locale', lang, loginStore.username)

  // reload page
  location.reload()
}
</script>

<template>
  <NeTitle>{{ t('standalone.account_management.title', { name: loginStore.username }) }}</NeTitle>
  <div class="max-w-3xl">
    <FormLayout
      :title="t('standalone.account_management.change_password')"
      :description="t('standalone.account_management.change_password_description')"
    >
      <ChangePassword />
    </FormLayout>
    <FormLayout :title="t('standalone.account_management.language')">
      <NeButton size="lg" @click="changeLocale('it')" class="mb-4 mr-4">ITA</NeButton>
      <NeButton size="lg" @click="changeLocale('en')" class="mb-4">ENG</NeButton>
    </FormLayout>
  </div>
</template>
