<script lang="ts" setup>
import {
  NeButton,
  NeFormItemLabel,
  NeSideDrawer,
  NeTextInput,
  NeToggle
} from '@nethesis/vue-components'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { MessageBag } from '@/lib/validation.ts'
import NeMultiTextInput from '@/components/standalone/NeMultiTextInput.vue'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus.ts'
import AdvancedSettingsDropdown from '@/components/AdvancedSettingsDropdown.vue'
import type { ClientTunnel } from '@/components/standalone/wireguard/WireguardPeerTunnelList.vue'

const { t } = useI18n()

const { isShown, peer = undefined } = defineProps<{
  isShown: boolean
  peer?: ClientTunnel
}>()

const emit = defineEmits(['close', 'success'])

const id = ref<string>()
const peerId = ref<string>()
const enabled = ref(true)
const name = ref('')
const reservedIp = ref('')
const serverPublicKey = ref('')
const peerPrivateKey = ref('')
const preSharedKey = ref('')
const routeAllTraffic = ref(false)
const networkRoutes = ref<string[]>([''])
const endpoint = ref('')
const udpPort = ref('')
const dnsServers = ref<string[]>([''])

const editing = computed<boolean>(() => id.value != undefined)
const saveButtonLabel = computed<string>(() =>
  editing.value ? t('common.save') : t('standalone.wireguard_peers.add_tunnel')
)
const drawerTitle = computed<string>(() => {
  if (editing.value) {
    return t('standalone.wireguard_peers.edit_peer_tunnel')
  } else {
    return t('standalone.wireguard_peers.add_peer_tunnel')
  }
})

watch(
  () => isShown,
  (value) => {
    if (value) {
      error.value = undefined
      validation.value.clear()
      disableForm.value = false
      loading.value = false
      id.value = undefined
      peerId.value = undefined
      enabled.value = true
      name.value = ''
      reservedIp.value = ''
      serverPublicKey.value = ''
      peerPrivateKey.value = ''
      preSharedKey.value = ''
      routeAllTraffic.value = false
      networkRoutes.value = ['']
      endpoint.value = ''
      udpPort.value = ''
      dnsServers.value = ['']
      if (peer != undefined) {
        id.value = peer.id
        peerId.value = peer.peer_id
        enabled.value = peer.enabled
        name.value = peer.name
        reservedIp.value = peer.address
        serverPublicKey.value = peer.server_public_key
        peerPrivateKey.value = peer.peer_private_key
        preSharedKey.value = peer.pre_shared_key
        routeAllTraffic.value = peer.route_all_traffic
        if (peer.network_routes.length > 0) {
          networkRoutes.value = peer.network_routes
        }
        endpoint.value = peer.endpoint
        udpPort.value = String(peer.udp_port)
        if (peer.dns.length > 0) {
          dnsServers.value = peer.dns
        } else {
          dnsServers.value = ['']
        }
      }
    }
  }
)

const disableForm = ref(false)
const loading = ref(false)
const error = ref<Error>()
const validation = ref(new MessageBag())

function submit() {
  disableForm.value = true
  loading.value = true
  error.value = undefined
  validation.value.clear()
  let method: Promise<unknown>
  if (editing.value) {
    method = ubusCall('ns.wireguard', 'edit-tunnel', {
      id: id.value,
      peer_id: peerId.value,
      enabled: enabled.value,
      name: name.value,
      reserved_ip: reservedIp.value,
      server_public_key: serverPublicKey.value,
      peer_private_key: peerPrivateKey.value,
      pre_shared_key: preSharedKey.value,
      route_all_traffic: routeAllTraffic.value,
      network_routes: networkRoutes.value,
      endpoint: endpoint.value,
      udp_port: Number(udpPort.value),
      dns: dnsServers.value
    })
  } else {
    method = ubusCall('ns.wireguard', 'add-tunnel', {
      enabled: enabled.value,
      name: name.value,
      reserved_ip: reservedIp.value,
      server_public_key: serverPublicKey.value,
      peer_private_key: peerPrivateKey.value,
      pre_shared_key: preSharedKey.value,
      route_all_traffic: routeAllTraffic.value,
      network_routes: networkRoutes.value,
      endpoint: endpoint.value,
      udp_port: Number(udpPort.value),
      dns: dnsServers.value
    })
  }
  method
    .then(() => emit('success'))
    .catch((err) => {
      if (err instanceof ValidationError) {
        validation.value = err.errorBag
      } else {
        error.value = err
      }
      disableForm.value = false
      loading.value = false
    })
}
</script>

<template>
  <NeSideDrawer :is-shown="isShown" :title="drawerTitle" @close="$emit('close')">
    <form class="space-y-8" @submit.prevent="submit">
      <div>
        <NeFormItemLabel>{{ t('standalone.wireguard_peers.status') }}</NeFormItemLabel>
        <NeToggle
          v-model="enabled"
          :label="enabled ? t('common.enabled') : t('common.disabled')"
          :disabled="disableForm"
        />
      </div>
      <NeTextInput
        v-model="name"
        :disabled="disableForm"
        :invalid-message="t(validation.getFirstI18nKeyFor('name'))"
        :label="t('standalone.wireguard_peers.name')"
      />
      <NeTextInput
        v-model="reservedIp"
        :disabled="disableForm"
        :invalid-message="t(validation.getFirstI18nKeyFor('reserved_ip'))"
        :label="t('standalone.wireguard_peers.reserved_ip')"
      />
      <NeTextInput
        v-model="serverPublicKey"
        :disabled="disableForm"
        :invalid-message="t(validation.getFirstI18nKeyFor('server_public_key'))"
        :label="t('standalone.wireguard_peers.server_public_key')"
      />
      <NeTextInput
        v-model="peerPrivateKey"
        :disabled="disableForm"
        :invalid-message="t(validation.getFirstI18nKeyFor('peer_private_key'))"
        :label="t('standalone.wireguard_peers.peer_private_key')"
      />
      <NeTextInput
        v-model="preSharedKey"
        :disabled="disableForm"
        :invalid-message="t(validation.getFirstI18nKeyFor('pre_shared_key'))"
        :label="t('standalone.wireguard_peers.pre_shared_key')"
        optional
      />
      <div>
        <NeFormItemLabel>{{ t('standalone.wireguard_peers.route_all_traffic') }}</NeFormItemLabel>
        <NeToggle
          v-model="routeAllTraffic"
          :label="routeAllTraffic ? t('common.enabled') : t('common.disabled')"
          :disabled="disableForm"
        />
      </div>
      <NeMultiTextInput
        v-model="networkRoutes"
        required
        :disable-inputs="routeAllTraffic || disableForm"
        :disable-add-button="routeAllTraffic || disableForm"
        :title="t('standalone.wireguard_peers.network_routes')"
        :add-item-label="t('standalone.wireguard_peers.add_route')"
        :general-invalid-message="t(validation.getFirstI18nKeyFor('network_routes'))"
      />
      <NeTextInput
        v-model="endpoint"
        :disabled="disableForm"
        :invalid-message="t(validation.getFirstI18nKeyFor('endpoint'))"
        :label="t('standalone.wireguard_peers.endpoint')"
      />
      <NeTextInput
        v-model="udpPort"
        :disabled="disableForm"
        :invalid-message="t(validation.getFirstI18nKeyFor('udp_port'))"
        :label="t('standalone.wireguard_peers.udp_port')"
      />
      <AdvancedSettingsDropdown>
        <NeMultiTextInput
          v-model="dnsServers"
          :add-item-label="t('standalone.wireguard_tunnel.add_dns')"
          optional
          :disable-add-button="disableForm"
          :disable-inputs="disableForm"
          :general-invalid-message="t(validation.getFirstI18nKeyFor('dns'))"
          :optional-label="t('common.optional')"
          :title="t('standalone.wireguard_tunnel.dns_servers')"
          required
        />
      </AdvancedSettingsDropdown>
      <hr />
      <div class="flex justify-end gap-6">
        <NeButton kind="tertiary" :disabled="disableForm" @click="$emit('close')">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton :disabled="disableForm" :loading="loading" kind="primary" type="submit">
          {{ saveButtonLabel }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
