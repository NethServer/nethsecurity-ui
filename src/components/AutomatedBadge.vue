<script setup lang="ts">
import { NeBadge, NeTooltip } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <NeTooltip trigger-event="mouseenter focus" placement="top-start">
    <template #trigger>
      <NeBadge :text="t('common.automated')" />
    </template>
    <template #content>
      {{ t('common.automated_tooltip') }}
    </template>
  </NeTooltip>
</template>
