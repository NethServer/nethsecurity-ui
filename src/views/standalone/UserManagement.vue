<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeTitle } from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import ChangePassword from '@/components/standalone/account/ChangePassword.vue'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import FormLayout from '@/components/standalone/FormLayout.vue'

const { t } = useI18n()

const loginStore = useLoginStore()
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
  </div>
</template>
