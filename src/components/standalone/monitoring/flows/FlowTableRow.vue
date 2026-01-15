<script lang="ts" setup>
import type { Flow } from '@/components/standalone/monitoring/FlowsTable.vue'
import {
  byteFormat1024,
  NeBadgeV2,
  NeTableCell,
  NeTableRow,
  NeTooltip
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { differenceInSeconds } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faArrowDown,
  faArrowUp,
  faDiagramProject,
  faMagnifyingGlassPlus,
  faUsers
} from '@fortawesome/free-solid-svg-icons'
import { floor } from 'lodash-es'
import NetifydIcon from '@/components/standalone/NetifydIcon.vue'
import { useNetifydStore } from '@/stores/standalone/netifyd.ts'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import FlowBadge from '@/components/standalone/monitoring/flows/FlowBadge.vue'

const { data } = useNetifydStore()

const { item } = defineProps<{
  item: Flow
}>()

const { t } = useI18n()

const flowAge = computed<string>(() => {
  const totalSeconds = differenceInSeconds(item.last_seen_at, item.first_seen_at)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
})

const applicationName = computed<string>(() => {
  for (const application of data) {
    if (application.tag == item.detected_application_name) {
      return application.label
    }
  }
  return item.detected_application_name
})

export type Badge = {
  text: string
  icon: IconDefinition
  content?: string
  customClasses: string[]
}

const badges = computed<Badge[]>(() => {
  const entries: Badge[] = []
  switch (item.detected_protocol_name) {
    default:
      entries.push({
        text: item.detected_protocol_name,
        icon: faDiagramProject,
        customClasses: ['bg-gray-200', 'text-gray-800', 'dark:bg-gray-600', 'dark:text-gray-100']
      })
  }
  if (!item.local_origin && item.other_type == 'remote') {
    entries.push({
      text: t('standalone.flows.remote'),
      icon: faArrowDown,
      customClasses: ['bg-rose-100', 'text-rose-800', 'dark:bg-rose-700', 'dark:text-rose-100'],
      content: t('standalone.flows.remote_description')
    })
  }
  if (item.other_type == 'local') {
    entries.push({
      text: t('standalone.flows.internal'),
      icon: faUsers,
      customClasses: ['bg-blue-100', 'text-blue-800', 'dark:bg-blue-700', 'dark:text-blue-100'],
      content: t('standalone.flows.internal_description')
    })
  }
  return entries
})

const sourceIp = computed<string>(() => (item.local_origin ? item.local_ip : item.other_ip))
const destinationIp = computed<string>(() => (item.local_origin ? item.other_ip : item.local_ip))
</script>

<template>
  <NeTableRow>
    <NeTableCell :data-label="t('standalone.flows.application')">
      <span class="flex flex-wrap items-center gap-2">
        <NetifydIcon :name="item.detected_application_name" class="h-6 w-6" />
        <span>{{ applicationName }}</span>
      </span>
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.tags')">
      <span class="flex flex-wrap gap-2">
        <template v-for="badge in badges" :key="badge.text">
          <NeTooltip v-if="badge.content" trigger-event="mouseenter click">
            <template #content>
              {{ badge.content }}
            </template>
            <template #trigger>
              <FlowBadge :badge="badge" />
            </template>
          </NeTooltip>
          <FlowBadge v-else :badge="badge" />
        </template>
      </span>
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.source')">
      {{ sourceIp }}
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.destination')">
      <NeTooltip
        v-if="item.dns_host_name != undefined || item.host_server_name != undefined"
        trigger-event="mouseenter click"
      >
        <template #content>
          <p>Destination IP: {{ destinationIp }}</p>
          <p v-if="item.host_server_name != undefined">
            Destination DNS: {{ item.host_server_name }}
          </p>
        </template>
        <template #trigger>
          {{ item.dns_host_name ?? item.host_server_name }}
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
      {{ new Date(item.last_seen_at).toLocaleTimeString() }}
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.download')">
      <div class="flex items-center gap-2">
        <FontAwesomeIcon :icon="faArrowDown" />
        <span v-if="item.local_origin">{{ byteFormat1024(floor(item.local_rate)) }}</span>
        <span v-else>{{ byteFormat1024(floor(item.other_rate)) }}</span>
      </div>
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.upload')">
      <div class="flex items-center gap-2">
        <FontAwesomeIcon :icon="faArrowUp" />
        <span v-if="item.local_origin">{{ byteFormat1024(floor(item.other_rate)) }}</span>
        <span v-else>{{ byteFormat1024(floor(item.local_rate)) }}</span>
      </div>
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.more_info')">
      <FontAwesomeIcon :icon="faMagnifyingGlassPlus" />
    </NeTableCell>
  </NeTableRow>
</template>
