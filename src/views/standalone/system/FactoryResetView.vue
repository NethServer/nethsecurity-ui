<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeTitle } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import FactoryResetContent from '@/components/standalone/factory_reset/FactoryResetContent.vue'

const { t } = useI18n()
</script>

<template>
  <div>
    <NeTitle>{{ t('standalone.factory_reset.title') }}</NeTitle>
    <FactoryResetContent />
  </div>
</template>
