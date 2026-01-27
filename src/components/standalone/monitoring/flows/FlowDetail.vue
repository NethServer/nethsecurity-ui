<script lang="ts" setup>
import { byteFormat1024, kbpsFormat, NeCard, NeModal, NeToggle } from '@nethesis/vue-components'
import type { FlowEvent } from '@/components/standalone/monitoring/FlowsTable.vue'
import { useI18n } from 'vue-i18n'
import { computed, ref, watch } from 'vue'
import { formatDistance } from 'date-fns'
import { getNdpiRiskDescription } from '@/lib/standalone/ndpiRisks.ts'
import AdvancedSettingsDropdown from '@/components/AdvancedSettingsDropdown.vue'

const { t } = useI18n()

defineEmits<{
  close: []
}>()

const props = defineProps<{
  flow?: FlowEvent
}>()

const _flow = ref<FlowEvent>()
const showCardView = ref(false)

watch(
  () => props.flow,
  (val) => {
    if (val != undefined) {
      _flow.value = val
    }
  },
  {
    immediate: true
  }
)

type Fact = {
  label: string
  value: string | number
}

type FactsGroup = {
  title: string
  facts: Fact[] | string[]
}

const facts = computed<FactsGroup[]>(() => {
  if (_flow.value == undefined) {
    return []
  }

  const groups: FactsGroup[] = []

  // Endpoint Information
  groups.push({
    title: t('standalone.flows.endpoint_information'),
    facts: [
      {
        label: t('standalone.flows.source_ip'),
        value: source.value.ip
      },
      {
        label: t('standalone.flows.source_port'),
        value: source.value.port
      },
      {
        label: t('standalone.flows.source_mac'),
        value: source.value.mac != '00:00:00:00:00:00' ? source.value.mac : t('common.unknown')
      },
      {
        label: t('standalone.flows.destination_ip'),
        value: destination.value.ip
      },
      {
        label: t('standalone.flows.destination_port'),
        value: destination.value.port
      },
      {
        label: t('standalone.flows.destination_mac'),
        value:
          destination.value.mac != '00:00:00:00:00:00' ? destination.value.mac : t('common.unknown')
      }
    ]
  })

  // Hostname Information (conditional)
  if (hostnameInformationVisible.value) {
    const hostnameFacts: Fact[] = []

    if (_flow.value.flow.host_server_name) {
      hostnameFacts.push({
        label: t('standalone.flows.hostname'),
        value: _flow.value.flow.host_server_name
      })
    }

    if (_flow.value.flow.dns_host_name) {
      hostnameFacts.push({
        label: t('standalone.flows.domain'),
        value: _flow.value.flow.dns_host_name
      })
    }

    if (_flow.value.flow.ssl?.client_sni) {
      hostnameFacts.push({
        label: t('standalone.flows.tls_sni_hostname'),
        value: _flow.value.flow.ssl.client_sni
      })
    }

    if (hostnameFacts.length > 0) {
      groups.push({
        title: t('standalone.flows.hostname_information'),
        facts: hostnameFacts
      })
    }
  }

  // Traffic Inspection Details
  const trafficInspectionTitle =
    _flow.value.type == 'flow'
      ? t('standalone.flows.partial_traffic_inspection')
      : t('standalone.flows.traffic_inspection_details')

  groups.push({
    title: trafficInspectionTitle,
    facts: [
      {
        label: t('standalone.flows.protocol'),
        value: _flow.value.flow.detected_protocol_name
      },
      {
        label: t('standalone.flows.application'),
        value: _flow.value.flow.detected_application_name
      },
      {
        label: t('standalone.flows.packets_analyzed'),
        value: _flow.value.flow.detection_packets ?? 0
      }
    ]
  })

  // Risks Detected (conditional)
  if ((_flow.value.flow.risks.risks?.length ?? 0) > 0) {
    groups.push({
      title: t('standalone.flows.risks_detected'),
      facts: _flow.value.flow.risks.risks?.map((risk) => getNdpiRiskDescription(risk)) ?? []
    })
  }

  // Flow Info
  groups.push({
    title: t('standalone.flows.flow_info'),
    facts: [
      {
        label: t('standalone.flows.conntrack_id'),
        value: _flow.value.flow.conntrack.id
      },
      {
        label: t('standalone.flows.first_seen_at'),
        value: new Date(_flow.value.flow.first_seen_at).toLocaleString()
      },
      {
        label: t('standalone.flows.last_seen_at'),
        value: new Date(_flow.value.flow.last_seen_at).toLocaleString()
      },
      {
        label: t('standalone.flows.duration'),
        value: formatDistance(
          new Date(_flow.value.flow.first_seen_at),
          new Date(_flow.value.flow.last_seen_at)
        )
      }
    ]
  })

  // Traffic Flow
  groups.push({
    title: t('standalone.flows.traffic_flow'),
    facts: [
      {
        label: t('standalone.flows.download_rate'),
        value: formatRate(downloadRate.value)
      },
      {
        label: t('standalone.flows.upload_rate'),
        value: formatRate(uploadRate.value)
      },
      {
        label: t('standalone.flows.download_bytes'),
        value: byteFormat1024(downloadBytes.value)
      },
      {
        label: t('standalone.flows.upload_bytes'),
        value: byteFormat1024(uploadBytes.value)
      },
      {
        label: t('standalone.flows.total_bytes'),
        value: byteFormat1024(_flow.value.flow.total_bytes)
      }
    ]
  })

  return groups
})

type EndpointInfo = {
  ip: string
  port: number
  mac: string
}

const source = computed<EndpointInfo>(() => {
  let ip = ''
  let port = 0
  let mac = ''

  if (_flow.value != undefined) {
    if (_flow.value.flow.local_origin) {
      ip = _flow.value.flow.local_ip
      port = _flow.value.flow.local_port
      mac = _flow.value.flow.local_mac
    } else {
      ip = _flow.value.flow.other_ip
      port = _flow.value.flow.other_port
      mac = _flow.value.flow.other_mac
    }
  }

  return {
    ip,
    port,
    mac
  }
})

const destination = computed<EndpointInfo>(() => {
  let ip = ''
  let port = 0
  let mac = ''

  if (_flow.value != undefined) {
    if (_flow.value.flow.local_origin) {
      ip = _flow.value.flow.other_ip
      port = _flow.value.flow.other_port
      mac = _flow.value.flow.other_mac
    } else {
      ip = _flow.value.flow.local_ip
      port = _flow.value.flow.local_port
      mac = _flow.value.flow.local_mac
    }
  }

  return {
    ip,
    port,
    mac
  }
})

const uploadRate = computed(() => {
  if (_flow.value == undefined) {
    return 0
  }
  return _flow.value.flow.local_origin ? _flow.value.flow.local_rate : _flow.value.flow.other_rate
})

const downloadRate = computed(() => {
  if (_flow.value == undefined) {
    return 0
  }
  return _flow.value.flow.local_origin ? _flow.value.flow.other_rate : _flow.value.flow.local_rate
})

const uploadBytes = computed(() => {
  if (_flow.value == undefined) {
    return 0
  }
  return _flow.value.flow.local_origin ? _flow.value.flow.local_bytes : _flow.value.flow.other_bytes
})

const downloadBytes = computed(() => {
  if (_flow.value == undefined) {
    return 0
  }
  return _flow.value.flow.local_origin ? _flow.value.flow.other_bytes : _flow.value.flow.local_bytes
})

function formatRate(rate: number): string {
  // Convert bytes/s to Kbps: (bytes * 8 bits/byte) / 1000
  return kbpsFormat((rate * 8) / 1000)
}

const hostnameInformationVisible = computed<boolean>(() => {
  return [
    _flow.value?.flow.host_server_name != undefined,
    _flow.value?.flow.dns_host_name != undefined,
    _flow.value?.flow.ssl?.client_sni != undefined
  ].some((value) => value)
})

function isStringArray(facts: Fact[] | string[]): facts is string[] {
  return typeof facts[0] == 'string'
}
</script>

<template>
  <NeModal
    :close-aria-label="t('common.close')"
    :primary-label="t('common.close')"
    :title="t('standalone.flows.flow_details')"
    :visible="flow != undefined"
    kind="neutral"
    :size="showCardView ? 'xxl' : 'lg'"
    @close="$emit('close')"
    @primary-click="$emit('close')"
  >
    <div class="space-y-4">
      <!-- Toggle for card/list view -->
      <div v-if="_flow != undefined" class="flex justify-end">
        <NeToggle v-model="showCardView" label="Card view" />
      </div>

      <!-- List view -->
      <div v-if="_flow != undefined && !showCardView">
        <div v-for="entry in facts" :key="entry.title" class="mb-6">
          <h1 class="pb-2 text-xl">{{ entry.title }}</h1>
          <ul v-if="isStringArray(entry.facts)">
            <li
              v-for="(item, index) in entry.facts"
              :key="index"
              class="border-gray-200 px-4 py-2 not-last:border-b dark:border-gray-700"
            >
              {{ item }}
            </li>
          </ul>
          <dl v-else>
            <div
              v-for="item in entry.facts"
              :key="item.label"
              class="flex gap-4 border-gray-200 px-4 py-2 not-last:border-b dark:border-gray-700"
            >
              <dt class="font-medium">{{ item.label }}</dt>
              <dd class="ml-auto">{{ item.value }}</dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Card view -->
      <div v-if="_flow != undefined && showCardView" class="gap-4 sm:grid sm:grid-cols-2">
        <NeCard v-for="entry in facts" :key="entry.title">
          <template #title>{{ entry.title }}</template>
          <ul v-if="isStringArray(entry.facts)">
            <li v-for="(item, index) in entry.facts" :key="index" class="list-inside list-disc">
              {{ item }}
            </li>
          </ul>
          <dl v-else class="*:sm:grid *:sm:grid-cols-2 *:sm:gap-4">
            <div v-for="fact in entry.facts" :key="fact.label">
              <dt>{{ fact.label }}</dt>
              <dd>{{ fact.value }}</dd>
            </div>
          </dl>
        </NeCard>
      </div>

      <AdvancedSettingsDropdown>
        <pre class="col-span-full overflow-auto rounded-md bg-gray-50 p-4 text-sm dark:bg-gray-900">
        <code>{{ JSON.stringify(_flow, null, 2) }}</code>
      </pre>
      </AdvancedSettingsDropdown>
    </div>
  </NeModal>
</template>
