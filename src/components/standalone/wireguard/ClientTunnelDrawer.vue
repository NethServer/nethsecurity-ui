<script lang="ts" setup>
import {
  NeButton,
  NeFormItemLabel,
  NeSideDrawer,
  NeTextInput,
  NeToggle
} from '@nethesis/vue-components'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { MessageBag } from '@/lib/validation.ts'
import NeMultiTextInput from '@/components/standalone/NeMultiTextInput.vue'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus.ts'
import AdvancedSettingsDropdown from '@/components/AdvancedSettingsDropdown.vue'

const { t } = useI18n()

const { isShown } = defineProps<{
  isShown: boolean
}>()

const emit = defineEmits(['close', 'success'])

const drawerTitle = computed<string>(() => {
  return t('standalone.wireguard_peers.add_peer_tunnel')
})

const editing = ref(false)
const saveButtonLabel = computed<string>(() => (editing.value ? t('common.save') : t('common.add')))

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
const dnsServers = ref('')

const disableForm = ref(false)
const loading = ref(false)
const error = ref<Error>()
const validation = ref(new MessageBag())

function addClientTunnel() {
  disableForm.value = true
  loading.value = true
  error.value = undefined
  validation.value.clear()
  ubusCall('ns.wireguard', 'add-tunnel', {
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
    <form class="space-y-8" @submit.prevent="addClientTunnel">
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
        <NeTextInput
          v-model="dnsServers"
          :disabled="disableForm"
          :label="t('standalone.wireguard_peers.dns_servers')"
          optional
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
