<script lang="ts" setup>
import { byteFormat1024, kbpsFormat, NeCard, NeModal } from '@nethesis/vue-components'
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
</script>

<template>
  <NeModal
    :close-aria-label="t('common.close')"
    :primary-label="t('common.close')"
    :title="t('standalone.flows.flow_details')"
    :visible="flow != undefined"
    kind="neutral"
    size="xxl"
    @close="$emit('close')"
    @primary-click="$emit('close')"
  >
    <div class="space-y-4">
      <div
        v-if="_flow != undefined"
        class="gap-4 sm:grid sm:grid-cols-2 **:data-facts:*:sm:grid **:data-facts:*:sm:grid-cols-2 **:data-facts:*:sm:gap-4"
      >
        <NeCard>
          <template #title>{{ t('standalone.flows.endpoint_information') }}</template>
          <dl data-facts>
            <div>
              <dt>{{ t('standalone.flows.source_ip') }}</dt>
              <dd>{{ source.ip }}</dd>
            </div>
            <div>
              <dt>{{ t('standalone.flows.source_port') }}</dt>
              <dd>{{ source.port }}</dd>
            </div>
            <div>
              <dt>{{ t('standalone.flows.source_mac') }}</dt>
              <dd v-if="source.mac != '00:00:00:00:00:00'">{{ source.mac }}</dd>
              <dd v-else>{{ t('common.unknown') }}</dd>
            </div>
            <div>
              <dt>{{ t('standalone.flows.destination_ip') }}</dt>
              <dd>{{ destination.ip }}</dd>
            </div>
            <div>
              <dt>{{ t('standalone.flows.destination_port') }}</dt>
              <dd>{{ destination.port }}</dd>
            </div>
            <div>
              <dt>{{ t('standalone.flows.destination_mac') }}</dt>
              <dd v-if="destination.mac != '00:00:00:00:00:00'">{{ destination.mac }}</dd>
              <dd v-else>{{ t('common.unknown') }}</dd>
            </div>
          </dl>
        </NeCard>
        <NeCard v-if="hostnameInformationVisible">
          <template #title>{{ t('standalone.flows.hostname_information') }}</template>
          <dl data-facts>
            <div v-if="_flow.flow.host_server_name">
              <dt>{{ t('standalone.flows.hostname') }}</dt>
              <dd>{{ _flow.flow.host_server_name }}</dd>
            </div>
            <div v-if="_flow.flow.dns_host_name">
              <dt>{{ t('standalone.flows.domain') }}</dt>
              <dd>{{ _flow.flow.dns_host_name }}</dd>
            </div>
            <div v-if="_flow.flow.ssl?.client_sni">
              <dt>{{ t('standalone.flows.tls_sni_hostname') }}</dt>
              <dd>{{ _flow.flow.ssl.client_sni }}</dd>
            </div>
          </dl>
        </NeCard>
        <NeCard>
          <template #title>
            <template v-if="_flow.type == 'flow'">
              {{ t('standalone.flows.partial_traffic_inspection') }}
            </template>
            <template v-else>
              {{ t('standalone.flows.traffic_inspection_details') }}
            </template>
          </template>
          <dl data-facts>
            <div>
              <dt>{{ t('standalone.flows.protocol') }}</dt>
              <dd>{{ _flow.flow.detected_protocol_name }}</dd>
            </div>
            <div>
              <dt>{{ t('standalone.flows.application') }}</dt>
              <dd>{{ _flow.flow.detected_application_name }}</dd>
            </div>
            <div>
              <dt>{{ t('standalone.flows.packets_analyzed') }}</dt>
              <dd>{{ _flow.flow.detection_packets }}</dd>
            </div>
          </dl>
        </NeCard>
        <NeCard v-if="_flow.flow.risks.risks?.length ?? 0 > 0">
          <template #title>{{ t('standalone.flows.risks_detected') }}</template>
          <ul class="list-inside list-disc">
            <li v-for="risk in _flow.flow.risks.risks" :key="risk">
              {{ getNdpiRiskDescription(risk) }}
            </li>
          </ul>
        </NeCard>
        <NeCard>
          <template #title>{{ t('standalone.flows.flow_info') }}</template>
          <dl data-facts>
            <div>
              <dt>{{ t('standalone.flows.conntrack_id') }}</dt>
              <dd>{{ _flow.flow.conntrack.id }}</dd>
            </div>
            <div>
              <dt>{{ t('standalone.flows.first_seen_at') }}</dt>
              <dd>{{ new Date(_flow.flow.first_seen_at).toLocaleString() }}</dd>
            </div>
            <div>
              <dt>{{ t('standalone.flows.last_seen_at') }}</dt>
              <dd>{{ new Date(_flow.flow.last_seen_at).toLocaleString() }}</dd>
            </div>
            <div>
              <dt>{{ t('standalone.flows.duration') }}</dt>
              <dd>
                {{
                  formatDistance(
                    new Date(_flow.flow.first_seen_at),
                    new Date(_flow.flow.last_seen_at)
                  )
                }}
              </dd>
            </div>
          </dl>
        </NeCard>
        <NeCard>
          <template #title>{{ t('standalone.flows.traffic_flow') }}</template>
          <dl data-facts>
            <div>
              <dt>{{ t('standalone.flows.download_rate') }}</dt>
              <dd>{{ formatRate(downloadRate) }}</dd>
            </div>
            <div>
              <dt>{{ t('standalone.flows.upload_rate') }}</dt>
              <dd>{{ formatRate(uploadRate) }}</dd>
            </div>
            <div>
              <dt>{{ t('standalone.flows.download_bytes') }}</dt>
              <dd>{{ byteFormat1024(downloadBytes) }}</dd>
            </div>
            <div>
              <dt>{{ t('standalone.flows.upload_bytes') }}</dt>
              <dd>{{ byteFormat1024(uploadBytes) }}</dd>
            </div>
            <div>
              <dt>{{ t('standalone.flows.total_bytes') }}</dt>
              <dd>{{ byteFormat1024(_flow.flow.total_bytes) }}</dd>
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
