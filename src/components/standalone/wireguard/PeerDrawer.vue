<script setup lang="ts">
import {
  NeButton,
  NeFormItemLabel,
  NeSideDrawer,
  NeTextInput,
  NeToggle,
  NeInlineNotification
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { computed, ref, watch } from 'vue'
import { MessageBag } from '@/lib/validation.ts'
import NeMultiTextInput from '@/components/standalone/NeMultiTextInput.vue'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus.ts'
import type { Tunnel, Peer } from '@/views/standalone/vpn/WireguardTunnelView.vue'
import type { AxiosResponse } from 'axios'
import * as v from 'valibot'

const {
  isShown,
  instance = undefined,
  peer = undefined
} = defineProps<{
  isShown: boolean
  instance?: Tunnel
  peer?: Peer
}>()

const { t } = useI18n()

const emits = defineEmits(['close', 'success'])

function toggleState(state: boolean) {
  return state ? t('common.enabled') : t('common.disabled')
}

const enabled = ref(true)
const enabledLabel = computed<string>(() => toggleState(enabled.value))
const peerName = ref('')
const reservedIp = ref('')
const preSharedKey = ref(false)
const preSharedKeyLabel = computed<string>(() => toggleState(preSharedKey.value))
const routeAllTraffic = ref(false)
const routeAllTrafficLabel = computed<string>(() => toggleState(routeAllTraffic.value))
const remoteNetworks = ref<string[]>([''])
const localNetworks = ref<string[]>([''])

const disableForm = ref(true)
const loading = ref(false)
const error = ref<Error>()
const validation = ref(new MessageBag())

const editing = ref(false)

watch(
  () => isShown,
  (newVal) => {
    if (newVal) {
      editing.value = false
      validation.value.clear()
      error.value = undefined
      disableForm.value = false
      loading.value = false
      enabled.value = true
      peerName.value = ''
      preSharedKey.value = false
      routeAllTraffic.value = false
      remoteNetworks.value = ['']
      localNetworks.value = ['']
      if (peer != undefined) {
        enabled.value = peer.enabled
        peerName.value = peer.name
        reservedIp.value = peer.reserved_ip
        preSharedKey.value = peer.pre_shared_key
        routeAllTraffic.value = peer.route_all_traffic
        if (peer.remote_networks.length > 0) {
          remoteNetworks.value = peer.remote_networks
        } else {
          remoteNetworks.value = ['']
        }
        if (peer.local_networks.length > 0) {
          localNetworks.value = peer.local_networks
        } else {
          localNetworks.value = ['']
        }
        editing.value = true
      } else {
        fetchPeerConfig()
      }
    }
  },
  { immediate: true }
)

type PeerConfig = AxiosResponse<{
  local_networks: string[]
  reserved_ip: string
}>

function fetchPeerConfig() {
  disableForm.value = true
  error.value = undefined
  ubusCall<PeerConfig>('ns.wireguard', 'get-peer-defaults', {
    instance: instance?.id
  })
    .then((result) => {
      localNetworks.value = result.data.local_networks
      reservedIp.value = result.data.reserved_ip
      disableForm.value = false
    })
    .catch(() => {
      error.value = new Error(t('standalone.wireguard_tunnel.error_fetching_peer_config'))
    })
}

function validate() {
  validation.value.clear()

  const RequiredString = v.pipe(v.string(), v.nonEmpty('error.required'))

  const validator = v.object({
    name: RequiredString,
    reservedIp: RequiredString
  })

  type validatorSchema = typeof validator

  const check = v.safeParse(validator, {
    name: peerName.value,
    reservedIp: reservedIp.value
  })

  if (!check.success) {
    const flatted = v.flatten<validatorSchema>(check.issues).nested
    for (const key in flatted) {
      validation.value.set(key, flatted[key as v.IssueDotPath<validatorSchema>]![0])
    }
  }

  return validation.value.size == 0
}

function submitForm() {
  if (!validate()) {
    return
  }
  error.value = undefined
  disableForm.value = true
  loading.value = true
  let method: Promise<unknown>
  if (peer == undefined) {
    method = ubusCall('ns.wireguard', 'add-peer', {
      instance: instance!.id,
      enabled: enabled.value,
      name: peerName.value,
      reserved_ip: reservedIp.value,
      pre_shared_key: preSharedKey.value,
      route_all_traffic: routeAllTraffic.value,
      local_networks: localNetworks.value,
      remote_networks: remoteNetworks.value
    })
  } else {
    method = ubusCall('ns.wireguard', 'edit-peer', {
      instance: instance!.id,
      id: peer.id,
      enabled: enabled.value,
      name: peerName.value,
      reserved_ip: reservedIp.value,
      pre_shared_key: preSharedKey.value,
      route_all_traffic: routeAllTraffic.value,
      local_networks: localNetworks.value,
      remote_networks: remoteNetworks.value
    })
  }
  method
    .then(() => emits('success'))
    .catch((err) => {
      if (err instanceof ValidationError) {
        console.error(err.errorBag)
        validation.value = err.errorBag
      } else {
        error.value = err
      }
      loading.value = false
      disableForm.value = false
    })
}

const drawerTitle = computed(() => {
  if (editing.value) {
    return t('standalone.wireguard_tunnel.edit_peer')
  } else {
    return t('standalone.wireguard_tunnel.add_peer')
  }
})

const saveButtonLabel = computed(() => {
  if (editing.value) {
    return t('common.save')
  } else {
    return t('standalone.wireguard_tunnel.add_peer')
  }
})
</script>

<template>
  <NeSideDrawer :is-shown="isShown" :title="drawerTitle" @close="emits('close')">
    <form class="space-y-8" @submit.prevent="submitForm">
      <NeInlineNotification v-if="error != undefined" kind="error" title="testing" />
      <div>
        <NeFormItemLabel>{{ t('standalone.wireguard_tunnel.status') }}</NeFormItemLabel>
        <NeToggle v-model="enabled" :label="enabledLabel" :disabled="disableForm" />
      </div>
      <NeTextInput
        v-model="peerName"
        :disabled="disableForm"
        :invalid-message="t(validation.getFirstI18nKeyFor('name'))"
        :label="t('standalone.wireguard_tunnel.name')"
      />
      <NeTextInput
        v-model="reservedIp"
        :disabled="disableForm"
        :invalid-message="t(validation.getFirstI18nKeyFor('reserved_ip'))"
        :label="t('standalone.wireguard_tunnel.reserved_ip')"
      />
      <div>
        <NeFormItemLabel>{{ t('standalone.wireguard_tunnel.pre_shared_key') }}</NeFormItemLabel>
        <NeToggle v-model="preSharedKey" :label="preSharedKeyLabel" :disabled="disableForm" />
      </div>
      <div>
        <NeFormItemLabel>{{ t('standalone.wireguard_tunnel.route_all_traffic') }}</NeFormItemLabel>
        <NeToggle v-model="routeAllTraffic" :label="routeAllTrafficLabel" :disabled="disableForm" />
      </div>
      <NeMultiTextInput
        v-model="localNetworks"
        required
        :disable-inputs="routeAllTraffic || disableForm"
        :disable-add-button="routeAllTraffic || disableForm"
        :title="t('standalone.wireguard_tunnel.server_networks')"
        :add-item-label="t('standalone.wireguard_tunnel.add_network')"
        :general-invalid-message="t(validation.getFirstI18nKeyFor('local_networks'))"
      />
      <NeMultiTextInput
        v-model="remoteNetworks"
        required
        :disable-inputs="disableForm"
        :disable-add-button="disableForm"
        :title="t('standalone.wireguard_tunnel.peer_networks')"
        :add-item-label="t('standalone.wireguard_tunnel.add_network')"
        :general-invalid-message="t(validation.getFirstI18nKeyFor('remote_networks'))"
      />
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
