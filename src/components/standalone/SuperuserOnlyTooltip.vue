<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { NeTooltip } from '@nethesis/vue-components'

defineProps<{
  show: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <NeTooltip v-if="show" trigger-event="mouseenter focus" :interactive="false">
    <template #trigger>
      <slot />
    </template>
    <template #content>
      {{ t('common.only_root_can_perform_this_action') }}
    </template>
  </NeTooltip>
  <slot v-else />
</template>
