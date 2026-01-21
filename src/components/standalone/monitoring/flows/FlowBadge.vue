<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { NeBadgeV2 } from '@nethesis/vue-components'
import type { Badge } from '@/components/standalone/monitoring/flows/FlowTableRow.vue'

defineProps<{
  badge: Badge
}>()
</script>

<template>
  <NeBadgeV2 :custom-kind-classes="badge.customClasses.join(' ')" kind="custom" size="sm">
    <span class="flex items-center gap-1">
      <FontAwesomeIcon :icon="badge.icon" />
      {{ badge.text }}
    </span>
  </NeBadgeV2>
</template>
