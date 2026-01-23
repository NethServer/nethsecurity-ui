<script lang="ts" setup>
import { extractBadges, type FlowEvent } from '@/components/standalone/monitoring/FlowsTable.vue'
import { kbpsFormat, NeButton, NeTableCell, NeTableRow, NeTooltip } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { differenceInSeconds } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faArrowDown, faArrowUp, faMagnifyingGlassPlus } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import FlowBadge from '@/components/standalone/monitoring/flows/FlowBadge.vue'

const { item } = defineProps<{
  item: FlowEvent
}>()

defineEmits<{
  show: [flow: FlowEvent]
}>()

const { t } = useI18n()

const flowAge = computed<string>(() => {
  const totalSeconds = differenceInSeconds(item.flow.last_seen_at, item.flow.first_seen_at)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
})

const applicationName = computed<string>(() => {
  let name = item.flow.detected_application_name
  // Remove netify. prefix if present
  if (name.startsWith('netify.')) {
    name = name.substring(7)
  }
  // Replace dashes with spaces
  name = name.replace(/-/g, ' ')
  // Capitalize first character of each word
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
})

const badges = computed<Badge[]>(() => extractBadges(item))

const sourceIp = computed<string>(() =>
  item.flow.local_origin ? item.flow.local_ip : item.flow.other_ip
)
const destinationIp = computed<string>(() =>
  item.flow.local_origin ? item.flow.other_ip : item.flow.local_ip
)

function formatRate(rate: number): string {
  return kbpsFormat((rate * 8) / 1000)
}
</script>

<template>
  <NeTableRow>
    <NeTableCell :data-label="t('standalone.flows.application')">
      {{ applicationName }}
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.protocol')">
      {{ item.flow.detected_protocol_name }}
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.tags')">
      <span class="flex flex-wrap gap-2">
        <FlowBadge v-for="badge in badges" :key="badge.text" :badge="badge" />
      </span>
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.source')">
      {{ sourceIp }}
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.destination')">
      <NeTooltip
        v-if="item.flow.dns_host_name != undefined || item.flow.host_server_name != undefined"
        trigger-event="mouseenter click"
      >
        <template #content>
          <p>Destination IP: {{ destinationIp }}</p>
          <p v-if="item.flow.host_server_name != undefined">
            Destination DNS: {{ item.flow.host_server_name }}
          </p>
        </template>
        <template #trigger>
          {{ item.flow.dns_host_name ?? item.flow.host_server_name }}
        </template>
      </NeTooltip>
      <template v-else>
        {{ destinationIp }}
      </template>
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.duration')">
      {{ flowAge }}
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.last_seen_at')">
      {{ new Date(item.flow.last_seen_at).toLocaleTimeString() }}
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.download')">
      <div class="flex items-center gap-2">
        <FontAwesomeIcon :icon="faArrowDown" />
        <span v-if="item.flow.local_origin">{{ formatRate(item.flow.other_rate) }}</span>
        <span v-else>{{ formatRate(item.flow.local_rate) }}</span>
      </div>
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.upload')">
      <div class="flex items-center gap-2">
        <FontAwesomeIcon :icon="faArrowUp" />
        <span v-if="item.flow.local_origin">{{ formatRate(item.flow.local_rate) }}</span>
        <span v-else>{{ formatRate(item.flow.other_rate) }}</span>
      </div>
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.more_info')">
      <div class="flex items-start">
        <NeButton kind="tertiary" @click="$emit('show', item)">
          <FontAwesomeIcon :icon="faMagnifyingGlassPlus" />
        </NeButton>
      </div>
    </NeTableCell>
  </NeTableRow>
</template>
