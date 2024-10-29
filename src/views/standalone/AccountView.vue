<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeHeading } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import ChangePassword from '@/components/standalone/account/ChangePassword.vue'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import FormLayout from '@/components/standalone/FormLayout.vue'
import TwoFactorAuth from '@/components/standalone/account/two_fa/TwoFactorAuth.vue'
import ChangeLangCombobox from '@/components/ChangeLangCombobox.vue'

const { t } = useI18n()
const loginStore = useLoginStore()
</script>

<template>
  <NeHeading tag="h3" class="mb-7">{{
    t('standalone.account_management.title', { name: loginStore.username })
  }}</NeHeading>
  <div class="max-w-3xl space-y-8">
    <FormLayout :title="t('standalone.account_management.ui_language')">
      <ChangeLangCombobox />
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
