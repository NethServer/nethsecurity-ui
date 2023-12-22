<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeEmptyState, NeTitle } from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col">
    <NeTitle level="h3">{{ t('standalone.openvpn_rw.roadwarrior_accounts') }}</NeTitle>
    <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
      {{ t('standalone.openvpn_rw.roadwarrior_accounts_description') }}
    </p>
  </div>
  <NeEmptyState :title="'Work in progress'" :icon="['fas', 'circle-info']" />
</template>
