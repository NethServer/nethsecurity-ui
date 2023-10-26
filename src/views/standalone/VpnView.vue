<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeEmptyState } from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div>
    <h1 class="page-title">{{ t('standalone.vpn.title') }}</h1>
    <NeEmptyState :title="t('common.page_under_construction')" :icon="['fas', 'traffic-cone']" />
  </div>
</template>
