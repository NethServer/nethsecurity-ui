<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { NeBadgeV2, NeTooltip } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { computed, h } from 'vue'
import type { Badge } from '@/components/standalone/monitoring/FlowsTable.vue'

const { t } = useI18n()

const props = defineProps<{
  badge: Badge
}>()

const badgeComponent = computed(() =>
  h(
    NeBadgeV2,
    {
      customKindClasses: props.badge.customClasses.join(' '),
      kind: 'custom',
      size: 'sm'
    },
    () =>
      h('span', { class: 'flex items-center gap-1' }, [
        h(FontAwesomeIcon, { icon: props.badge.icon }),
        t(props.badge.text)
      ])
  )
)
</script>

<template>
  <NeTooltip v-if="badge.content" trigger-event="mouseenter click">
    <template #content>
      {{ t(badge.content) }}
    </template>
    <template #trigger>
      <component :is="badgeComponent" />
    </template>
  </NeTooltip>
  <component :is="badgeComponent" v-else />
</template>
