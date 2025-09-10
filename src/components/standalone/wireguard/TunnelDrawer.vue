<script setup lang="ts">
import {
  NeSideDrawer,
  NeToggle,
  NeFormItemLabel,
  NeTextInput,
  NeTooltip,
  NeButton,
  NeInlineNotification
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { computed, ref, watch } from 'vue'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'
import AdvancedSettingsDropdown from '@/components/AdvancedSettingsDropdown.vue'
import * as v from 'valibot'
import { MessageBag } from '@/lib/validation.ts'

const { t } = useI18n()

const { isShown } = defineProps<{
  isShown: boolean
}>()

const enabled = ref(true)
const statusLabel = computed<string>(() => {
  return enabled.value ? t('common.enabled') : t('common.disabled')
})
const tunnelName = ref('')
const network = ref('')
const udpPort = ref('')
const publicIp = ref('')
const mtu = ref('')
const dnsServers = ref('')

type ServerSetup = AxiosResponse<{
  listen_port: number
  network: string
  public_endpoint: string
}>

const disableForm = ref(false)
const errorFetchingServerSetup = ref(false)
const tunnelInstance = ref('')
function loadSuggestions() {
  tunnelInstance.value = ''
  disableForm.value = true
  errorFetchingServerSetup.value = false
  ubusCall<ServerSetup>('ns.wireguard', 'get-instance-defaults')
    .then((result) => {
      network.value = result.data.network
      udpPort.value = result.data.listen_port.toString()
      publicIp.value = result.data.public_endpoint
    })
    .catch(() => (errorFetchingServerSetup.value = true))
    .finally(() => (disableForm.value = false))
}

const validation = ref(new MessageBag())

watch(
  () => isShown,
  (newVal) => {
    if (newVal) {
      validation.value.clear()
      loadSuggestions()
    }
  },
  { immediate: true }
)

const emit = defineEmits(['close', 'success'])

function validate() {
  validation.value.clear()

  const RequiredString = v.pipe(v.string(), v.nonEmpty('error.required'))

  const validator = v.object({
    name: RequiredString,
    network: RequiredString,
    udpPort: v.number('error.invalid'),
    publicIp: RequiredString
  })

  type validatorSchema = typeof validator

  const check = v.safeParse(validator, {
    name: tunnelName.value,
    network: network.value,
    udpPort: Number(udpPort.value),
    publicIp: publicIp.value
  })

  if (!check.success) {
    const flatted = v.flatten<validatorSchema>(check.issues).nested
    for (const key in flatted) {
      validation.value.set(key, flatted[key as v.IssueDotPath<validatorSchema>]![0])
    }
  }

  return validation.value.size == 0
}

const loading = ref(false)
const error = ref<Error>()
function addTunnel() {
  if (!validate()) {
    return
  }
  error.value = undefined
  disableForm.value = true
  loading.value = true
  ubusCall('ns.wireguard', 'add-server', {
    enabled: enabled.value,
    name: tunnelName.value,
    public_endpoint: publicIp.value,
    listen_port: Number(udpPort.value),
    network: network.value,
    mtu: mtu.value,
    dns: dnsServers.value
  })
    .then(() => emit('success'))
    .catch((err) => {
      if (err instanceof ValidationError) {
        validation.value = err.errorBag
      } else {
        error.value = err
      }
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
      <NeInlineNotification
        v-if="errorFetchingServerSetup"
        :description="t('standalone.wireguard_tunnel.error_fetching_server_setup_description')"
        :title="t('standalone.wireguard_tunnel.error_fetching_server_setup')"
        kind="error"
      />
      <template v-else>
        <div>
          <NeFormItemLabel>{{ t('standalone.wireguard_tunnel.status') }}</NeFormItemLabel>
          <NeToggle v-model="enabled" :label="statusLabel" />
        </div>
        <NeTextInput
          v-model="tunnelName"
          :disabled="disableForm"
          :invalid-message="t(validation.getFirstI18nKeyFor('name'))"
          :label="t('standalone.wireguard_tunnel.name')"
        />
        <NeTextInput
          v-model="network"
          :disabled="disableForm"
          :invalid-message="t(validation.getFirstI18nKeyFor('network'))"
          :label="t('standalone.wireguard_tunnel.vpn_network')"
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
          :disabled="disableForm"
          :label="t('standalone.wireguard_tunnel.udp_port')"
          :invalid-message="t(validation.getFirstI18nKeyFor('udpPort'))"
        />
        <NeTextInput
          v-model="publicIp"
          :disabled="disableForm"
          :label="t('standalone.wireguard_tunnel.public_ip')"
          :invalid-message="t(validation.getFirstI18nKeyFor('publicIp'))"
        />
        <AdvancedSettingsDropdown>
          <NeTextInput
            v-model="mtu"
            :disabled="disableForm"
            :label="t('standalone.wireguard_tunnel.mtu')"
            optional
          />
          <NeTextInput
            v-model="dnsServers"
            :disabled="disableForm"
            :label="t('standalone.wireguard_tunnel.dns_servers')"
            optional
          />
        </AdvancedSettingsDropdown>
      </template>
      <hr />
      <div class="flex justify-end gap-6">
        <NeButton kind="tertiary" :disabled="disableForm" @click="$emit('close')">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          v-if="!errorFetchingServerSetup"
          :disabled="disableForm"
          :loading="loading"
          kind="primary"
          type="submit"
        >
          {{ t('standalone.wireguard_tunnel.add_server') }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
