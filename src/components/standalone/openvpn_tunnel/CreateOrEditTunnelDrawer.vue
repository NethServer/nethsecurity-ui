<script setup lang="ts">
import { ref, toRefs } from 'vue'
import { MessageBag, type validationOutput } from '@/lib/validation'
import { onMounted } from 'vue'
import { watchEffect } from 'vue'
import {
  NeSideDrawer,
  NeInlineNotification,
  NeToggle,
  NeTextInput,
  NeButton,
  getAxiosErrorMessage,
  NeTooltip,
  NeCombobox,
  NeFormItemLabel,
  NeTextArea,
  type NeComboboxOption,
  NeRadioSelection
} from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import type { ServerTunnelType } from './ServerTunnel.vue'
import NeMultiTextInput from '../NeMultiTextInput.vue'

const props = defineProps<{
  isShown: boolean
  itemToEdit: ServerTunnelType | null
  isClientTunnel: boolean
}>()
const { isShown } = toRefs(props)

const { t } = useI18n()

const emit = defineEmits(['close', 'add-edit-tunnel'])

const loading = ref(false)
const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: ''
})
const validationErrorBag = ref(new MessageBag())

// Shared form fields
const id = ref('')
const enabled = ref(true)
const name = ref('')
const remoteNetworks = ref<string[]>([''])
const topology = ref<'subnet' | 'p2p'>('subnet')
const vpnNetwork = ref('')
const localP2pIp = ref('')
const remoteP2pIp = ref('')
const presharedKey = ref('')
const protocol = ref<'tcp' | 'udp'>('udp')
const compression = ref('auto')
const digest = ref('auto')
const cipher = ref('auto')

// Server tunnel form fields
const publicEndpoints = ref<string[]>([''])
const port = ref('')
const localNetworks = ref<NeComboboxOption[]>([])
const minimumTLSVersion = ref('auto')

// Client tunnel form fields
const remoteHosts = ref<string[]>([''])
const remotePort = ref('')
const authentication = ref<'certificate' | 'username_password_certificate'>('certificate')
const username = ref('')
const password = ref('')
const certificate = ref('')
const mode = ref<'bridged' | 'routed'>('bridged')

const showAdvancedSettings = ref(false)

const compressionOptions = [
  {
    id: 'auto',
    label: t('standalone.openvpn_tunnel.auto')
  }
]

const topologyOptions = [
  {
    id: 'subnet',
    label: t('standalone.openvpn_tunnel.subnet')
  },
  {
    id: 'p2p',
    label: t('standalone.openvpn_tunnel.p2p')
  }
]

const authenticationOptions = [
  {
    id: 'certificate',
    label: t('standalone.openvpn_tunnel.certificate')
  },
  {
    id: 'username_password_certificate',
    label: t('standalone.openvpn_tunnel.username_password_certificate')
  }
]

const modeOptions = [
  {
    id: 'bridged',
    label: t('standalone.openvpn_tunnel.bridged')
  },
  {
    id: 'routed',
    label: t('standalone.openvpn_tunnel.routed')
  }
]

const protocolOptions = [
  {
    id: 'udp',
    label: t('standalone.openvpn_tunnel.udp')
  },
  {
    id: 'tcp',
    label: t('standalone.openvpn_tunnel.tcp')
  }
]

const digestOptions = [
  {
    id: 'auto',
    label: t('standalone.openvpn_tunnel.auto'),
    description: `(${t('standalone.openvpn_tunnel.server_client_negotiation')})`
  }
]

const cipherOptions = [
  {
    id: 'auto',
    label: t('standalone.openvpn_tunnel.auto'),
    description: `(${t('standalone.openvpn_tunnel.server_client_negotiation')})`
  }
]

const tlsOptions = [
  {
    id: 'auto',
    label: t('standalone.openvpn_tunnel.auto')
  }
]

function resetForm() {
  //TODO: fill in after knowing payload format
}

function runValidators(validators: validationOutput[], label: string): boolean {
  for (let validator of validators) {
    if (!validator.valid) {
      validationErrorBag.value.set(label, [t(validator.errMessage as string)])
    }
  }

  return validators.every((validator) => validator.valid)
}

function validate() {
  return true
}

async function createOrEditTunnel() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  const isEditing = id.value != ''

  try {
    isSavingChanges.value = true
    const requestType = isEditing ? '<edit-endpoint>' : '<add-endpoint>'

    if (validate()) {
      //TODO: handle request
      emit('add-edit-tunnel')
      close()
    }
  } catch (err: any) {
    error.value.notificationTitle = isEditing
      ? t('error.cannot_edit_tunnel')
      : t('error.cannot_create_tunnel')

    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  } finally {
    isSavingChanges.value = false
  }
}

function close() {
  validationErrorBag.value.clear()
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  resetForm()
  emit('close')
}

watchEffect(() => {
  resetForm()
})

onMounted(() => {
  resetForm()
})
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="close()"
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
    :title="
      id
        ? t('standalone.openvpn_tunnel.edit_server_tunnel')
        : t('standalone.openvpn_tunnel.add_server_tunnel')
    "
  >
    <NeInlineNotification
      v-if="error.notificationTitle"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
    />
    <div class="flex flex-col gap-y-6">
      <div>
        <NeFormItemLabel>{{ t('standalone.openvpn_tunnel.status') }}</NeFormItemLabel>
        <NeToggle
          v-model="enabled"
          :label="
            enabled
              ? t('standalone.openvpn_tunnel.enabled')
              : t('standalone.openvpn_tunnel.disabled')
          "
        />
      </div>
      <NeTextInput
        v-model="name"
        :label="t('standalone.openvpn_tunnel.tunnel_name')"
        :invalid-message="validationErrorBag.getFirstFor('name')"
      />
      <template v-if="!isClientTunnel">
        <NeMultiTextInput
          v-model="publicEndpoints"
          :add-item-label="t('standalone.openvpn_tunnel.add_endpoint')"
          :title="t('standalone.openvpn_tunnel.public_endpoints')"
          ><template #tooltip>
            <NeTooltip
              ><template #content>{{
                t('standalone.openvpn_tunnel.public_endpoints_tooltip')
              }}</template></NeTooltip
            >
          </template>
        </NeMultiTextInput>
        <NeTextInput
          v-model="port"
          :label="t('standalone.openvpn_tunnel.port')"
          :invalid-message="validationErrorBag.getFirstFor('port')"
        />
        <NeCombobox
          :label="t('standalone.openvpn_tunnel.local_networks')"
          :placeholder="t('standalone.openvpn_tunnel.choose_network')"
          :multiple="true"
          :options="[]"
          v-model="localNetworks"
          :invalid-message="validationErrorBag.getFirstFor('localNetworks')"
        />
        <NeMultiTextInput
          v-model="remoteNetworks"
          :add-item-label="t('standalone.openvpn_tunnel.add_remote_address')"
          :title="t('standalone.openvpn_tunnel.remote_networks')"
          ><template #tooltip>
            <NeTooltip
              ><template #content>{{
                t('standalone.openvpn_tunnel.remote_networks_tooltip')
              }}</template></NeTooltip
            >
          </template>
        </NeMultiTextInput>
      </template>
      <template v-else>
        <NeMultiTextInput
          v-model="remoteHosts"
          :add-item-label="t('standalone.openvpn_tunnel.add_remote_address')"
          :title="t('standalone.openvpn_tunnel.remote_hosts')"
        />
        <NeTextInput
          v-model="remotePort"
          :label="t('standalone.openvpn_tunnel.remote_port')"
          :invalid-message="validationErrorBag.getFirstFor('remotePort')"
        />
      </template>
      <NeRadioSelection
        :label="t('standalone.openvpn_tunnel.topology')"
        :options="topologyOptions"
        v-model="topology"
        ><template #tooltip>
          <NeTooltip
            ><template #content>{{
              t('standalone.openvpn_tunnel.topology_tooltip')
            }}</template></NeTooltip
          >
        </template></NeRadioSelection
      >
      <template v-if="topology == 'subnet'">
        <NeTextInput
          v-model="vpnNetwork"
          :label="t('standalone.openvpn_tunnel.vpn_network')"
          :invalid-message="validationErrorBag.getFirstFor('vpnNetwork')"
          v-if="!isClientTunnel"
        />
        <template v-else>
          <NeRadioSelection
            :label="t('standalone.openvpn_tunnel.authentication')"
            :options="authenticationOptions"
            v-model="authentication"
          />
          <template v-if="authentication == 'username_password_certificate'">
            <NeTextInput
              v-model="username"
              :label="t('standalone.openvpn_tunnel.username')"
              :invalid-message="validationErrorBag.getFirstFor('username')"
            />
            <NeTextInput
              v-model="password"
              :label="t('standalone.openvpn_tunnel.password')"
              :invalid-message="validationErrorBag.getFirstFor('password')"
            />
          </template>
          <NeTextArea v-model="certificate" :label="t('standalone.openvpn_tunnel.certificate')" />
        </template>
      </template>
      <template v-else>
        <NeTextInput
          v-model="localP2pIp"
          :label="t('standalone.openvpn_tunnel.local_p2p_ip')"
          :invalid-message="validationErrorBag.getFirstFor('localP2pIp')"
        />
        <NeTextInput
          v-model="remoteP2pIp"
          :label="t('standalone.openvpn_tunnel.remote_p2p_ip')"
          :invalid-message="validationErrorBag.getFirstFor('remoteP2pIp')"
        />
        <NeTextArea v-model="presharedKey" :label="t('standalone.openvpn_tunnel.preshared_key')" />
      </template>
      <div>
        <NeButton kind="tertiary" @click="showAdvancedSettings = !showAdvancedSettings">
          {{ t('standalone.dns_dhcp.advanced_settings') }}
          <template #suffix>
            <font-awesome-icon
              :icon="['fas', showAdvancedSettings ? 'chevron-up' : 'chevron-down']"
              class="h-4 w-4"
              aria-hidden="true"
            />
          </template>
        </NeButton>
      </div>
      <template v-if="showAdvancedSettings">
        <template v-if="isClientTunnel">
          <NeMultiTextInput
            v-model="remoteNetworks"
            :add-item-label="t('standalone.openvpn_tunnel.add_remote_address')"
            :title="t('standalone.openvpn_tunnel.remote_networks')"
            optional
            :optional-label="t('common.optional')"
            ><template #tooltip>
              <NeTooltip
                ><template #content>{{
                  t('standalone.openvpn_tunnel.remote_networks_tooltip')
                }}</template></NeTooltip
              >
            </template>
          </NeMultiTextInput>
          <NeRadioSelection
            :label="t('standalone.openvpn_tunnel.mode')"
            :options="modeOptions"
            v-model="mode"
          />
        </template>
        <NeRadioSelection
          :label="t('standalone.openvpn_tunnel.protocol')"
          :options="protocolOptions"
          v-model="protocol"
        />
        <NeCombobox
          :label="t('standalone.openvpn_tunnel.compression')"
          :options="compressionOptions"
          v-model="compression"
          :invalid-message="validationErrorBag.getFirstFor('compression')"
        />
        <NeCombobox
          :label="t('standalone.openvpn_tunnel.digest')"
          :options="digestOptions"
          v-model="digest"
          :invalid-message="validationErrorBag.getFirstFor('localNetworks')"
        />
        <NeCombobox
          :label="t('standalone.openvpn_tunnel.cipher')"
          :options="cipherOptions"
          v-model="cipher"
          :invalid-message="validationErrorBag.getFirstFor('cipher')"
        />
        <NeCombobox
          :label="t('standalone.openvpn_tunnel.enforce_minimum_tls_version')"
          :options="tlsOptions"
          v-model="minimumTLSVersion"
          :invalid-message="validationErrorBag.getFirstFor('minimumTLSVersion')"
          v-if="!isClientTunnel"
        />
      </template>
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="createOrEditTunnel()"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{ t('common.save') }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
</template>
