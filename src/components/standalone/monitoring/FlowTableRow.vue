<script lang="ts" setup>
import type { Flow } from '@/components/standalone/monitoring/FlowsTable.vue'
import { byteFormat1024, NeTableCell, NeTableRow } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { differenceInSeconds } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faArrowDown, faArrowUp } from '@fortawesome/free-solid-svg-icons'
import { floor } from 'lodash-es'

const { item } = defineProps<{
  item: Flow
}>()

const { t } = useI18n()

function getOther(item: Flow) {
  if (item.host_server_name != undefined) {
    return item.host_server_name
  } else if (item.dns_host_name) {
    return item.dns_host_name
  } else {
    return item.other_ip
  }
}

const source = computed<string>(() => {
  if (item.local_origin) {
    return `${item.local_ip}:${item.local_port}`
  } else {
    return `${getOther(item)}:${item.other_port}`
  }
})

const totalDownload = computed<string>(() => {
  if (item.local_origin) {
    return byteFormat1024(floor(item.local_bytes))
  } else {
    return byteFormat1024(floor(item.other_bytes))
  }
})

const totalUpload = computed<string>(() => {
  if (item.local_origin) {
    return byteFormat1024(floor(item.other_bytes))
  } else {
    return byteFormat1024(floor(item.local_bytes))
  }
})

const downloadRate = computed<string>(() => {
  if (item.local_origin) {
    return byteFormat1024(floor(item.local_rate))
  } else {
    return byteFormat1024(floor(item.other_rate))
  }
})

const uploadRate = computed<string>(() => {
  if (item.local_origin) {
    return byteFormat1024(floor(item.other_rate))
  } else {
    return byteFormat1024(floor(item.local_rate))
  }
})

const other = computed<string>(() => {
  if (item.local_origin) {
    return `${getOther(item)}:${item.other_port}`
  } else {
    return `${item.local_ip}:${item.local_port}`
  }
})

const flowAge = computed<string>(() => {
  const totalSeconds = differenceInSeconds(item.last_seen_at, item.first_seen_at)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
})
</script>

<template>
  <NeTableRow>
    <NeTableCell :data-label="t('standalone.flows.application')">
      {{ item.detected_application_name }}
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.protocol')">
      {{ item.detected_protocol_name }}
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.source')">
      {{ source }}
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.destination')">
      {{ other }}
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
        <span>{{ downloadRate }}</span>
      </div>
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.upload')">
      <div class="flex items-center gap-2">
        <FontAwesomeIcon :icon="faArrowUp" />
        <span>{{ uploadRate }}</span>
      </div>
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.total_download')">
      <div class="flex items-center gap-2">
        <FontAwesomeIcon :icon="faArrowDown" />
        <span>{{ totalDownload }}</span>
      </div>
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.flows.total_upload')">
      <div class="flex items-center gap-2">
        <FontAwesomeIcon :icon="faArrowUp" />
        <span>{{ totalUpload }}</span>
      </div>
    </NeTableCell>
  </NeTableRow>
</template>
