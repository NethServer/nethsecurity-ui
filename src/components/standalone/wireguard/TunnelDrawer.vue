<script setup lang="ts">
import {
  NeSideDrawer,
  NeToggle,
  NeFormItemLabel,
  NeTextInput,
  NeTooltip,
  NeButton
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { computed, ref, watch } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'
import AdvancedSettingsDropdown from '@/components/AdvancedSettingsDropdown.vue'

const { t } = useI18n()

const { isShown } = defineProps<{
  isShown: boolean
}>()

const enabled = ref(true)
const statusLabel = computed<string>(() => {
  return enabled.value ? t('common.enabled') : t('common.disabled')
})
const tunnelName = ref('')
const vpnNetwork = ref('')
const udpPort = ref('')
const publicIp = ref('')
const mtu = ref('')
const dnsServers = ref('')

type SuggestionResponse = AxiosResponse<{
  instance: string
  listen_port: number
  network: string
  public_endpoint: string
  routes: string[]
}>

const disableForm = ref(false)
function loadSuggestions() {
  disableForm.value = true
  // If there is an error, free the form anyway
  ubusCall<SuggestionResponse>('ns.wireguard', 'get-instance-defaults')
    .then((result) => {
      tunnelName.value = result.data.instance
      vpnNetwork.value = result.data.network
      udpPort.value = result.data.listen_port.toString()
      publicIp.value = result.data.public_endpoint
    })
    .finally(() => (disableForm.value = false))
}

watch(
  () => isShown,
  (newVal) => {
    if (newVal) {
      loadSuggestions()
    }
  },
  { immediate: true }
)

const emit = defineEmits(['close', 'success'])

const loading = ref(false)
const error = ref<Error>()
function addTunnel() {
  error.value = undefined
  disableForm.value = true
  loading.value = true
  ubusCall('ns.wireguard', 'set-instance', {
    instance: 'wg1',
    enabled: enabled.value,
    name: tunnelName.value,
    public_endpoint: publicIp.value,
    listen_port: udpPort.value,
    network: vpnNetwork.value,
    mtu: mtu.value,
    dns: dnsServers.value,
    routes: ['0.0.0.0/0']
  })
    .then(() => emit('success'))
    .catch((err) => {
      error.value = err
      loading.value = false
      disableForm.value = false
    })
}
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    :title="t('standalone.wireguard_tunnel.add_server')"
    @close="$emit('close')"
  >
    <form class="space-y-8" @submit="addTunnel">
      <div>
        <NeFormItemLabel>{{ t('standalone.wireguard_tunnel.status') }}</NeFormItemLabel>
        <NeToggle v-model="enabled" :label="statusLabel" />
      </div>
      <NeTextInput
        v-model="tunnelName"
        :label="t('standalone.wireguard_tunnel.name')"
        :disabled="disableForm"
        required
      />
      <NeTextInput
        v-model="vpnNetwork"
        :label="t('standalone.wireguard_tunnel.vpn_network')"
        :disabled="disableForm"
        required
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.wireguard_tunnel.vpn_network_tooltip') }}
            </template>
          </NeTooltip>
        </template>
      </NeTextInput>
      <NeTextInput
        v-model="udpPort"
        :label="t('standalone.wireguard_tunnel.udp_port')"
        :disabled="disableForm"
        required
      />
      <NeTextInput
        v-model="publicIp"
        :label="t('standalone.wireguard_tunnel.public_ip')"
        :disabled="disableForm"
        required
      />
      <AdvancedSettingsDropdown>
        <NeTextInput
          v-model="mtu"
          :label="t('standalone.wireguard_tunnel.mtu')"
          :disabled="disableForm"
          optional
        />
        <NeTextInput
          v-model="dnsServers"
          :label="t('standalone.wireguard_tunnel.dns_servers')"
          :disabled="disableForm"
          optional
        />
      </AdvancedSettingsDropdown>
      <hr />
      <div class="flex justify-end gap-6">
        <NeButton kind="tertiary" :disabled="disableForm" @click="$emit('close')">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton kind="primary" type="submit" :disabled="disableForm" :loading="loading">
          {{ t('standalone.wireguard_tunnel.add_server') }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
