<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { NeBadgeV2, NeTooltip } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import type { Badge } from '@/composables/useFlows'

const { t } = useI18n()

defineProps<{
  badge: Badge
}>()
</script>

<template>
  <NeTooltip v-if="badge.content" trigger-event="mouseenter click">
    <template #content>
      {{ t(badge.content) }}
    </template>
    <template #trigger>
      <NeBadgeV2 :custom-kind-classes="badge.customClasses.join(' ')" kind="custom" size="sm">
        <span class="flex items-center gap-1">
          <FontAwesomeIcon :icon="badge.icon" />
          {{ t(badge.text) }}
        </span>
      </NeBadgeV2>
    </template>
  </NeTooltip>
  <NeBadgeV2 v-else :custom-kind-classes="badge.customClasses.join(' ')" kind="custom" size="sm">
    <span class="flex items-center gap-1">
      <FontAwesomeIcon :icon="badge.icon" />
      {{ t(badge.text) }}
    </span>
  </NeBadgeV2>
</template>
