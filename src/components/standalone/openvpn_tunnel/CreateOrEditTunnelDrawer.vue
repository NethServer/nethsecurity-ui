<script setup lang="ts">
import { ref, toRefs, watch } from 'vue'
import {
  MessageBag,
  validateIp4Cidr,
  validateIpAddress,
  validatePort,
  validateRequired,
  validateRequiredOption,
  type validationOutput
} from '@/lib/validation'
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
  NeSkeleton,
  type NeComboboxOption,
  NeRadioSelection
} from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import type { ServerTunnel, ClientTunnel } from './TunnelManager.vue'
import NeMultiTextInput from '../NeMultiTextInput.vue'
import { ubusCall } from '@/lib/standalone/ubus'

type TunnelDefaults = {
  secret: string
  port: number
  server: string
  ifconfig_local: string
  ifconfig_remote: string
  route: string[]
  remote: string[]
}

type SharedTunnelPayload = {
  id?: string
  ns_name: string
  port: string
  proto: 'tcp' | 'udp'
  enabled: string
  remote: string[]
  secret?: string
  ifconfig_local?: string
  ifconfig_remote?: string
  compression?: string
  cipher?: string
  digest?: string
}

type ClientTunnelPayload = {
  dev_type: 'tun' | 'tap'
  route?: string[]
  certificate?: string
  username?: string
  password?: string
} & SharedTunnelPayload

type ServerTunnelPayload = {
  topology: 'subnet' | 'p2p'
  local: string[]
  ns_public_ip: string[]
  tls_version_min: string
  server: string
} & SharedTunnelPayload

const props = defineProps<{
  isShown: boolean
  itemToEdit: ServerTunnel | ClientTunnel | null
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
const remoteNetworksValidationErrors = ref<string[]>([])
const publicEndpointsValidationErrors = ref<string[]>([])
const remoteHostsValidationErrors = ref<string[]>([])

const showAdvancedSettings = ref(false)

// Shared form fields
const id = ref('')
const enabled = ref(true)
const name = ref('')
const port = ref('')
const remoteNetworks = ref<string[]>([''])
const topology = ref<'subnet' | 'p2p'>('subnet')
const localP2pIp = ref('')
const remoteP2pIp = ref('')
const presharedKey = ref('')
const protocol = ref<'tcp' | 'udp'>('udp')
const compression = ref('disabled')
const digest = ref('auto')
const cipher = ref('auto')

// Server tunnel form fields
const publicEndpoints = ref<string[]>([''])
const localNetworks = ref<NeComboboxOption[]>([])
const minimumTLSVersion = ref('auto')
const vpnNetwork = ref('')

// Client tunnel form fields
const remoteHosts = ref<string[]>([''])
const authentication = ref<'certificate' | 'username_password_certificate'>('certificate')
const username = ref('')
const password = ref('')
const certificate = ref('')
const mode = ref<'bridged' | 'routed'>('bridged')

// remote options
const digestOptions = ref<NeComboboxOption[]>([])
const cipherOptions = ref<NeComboboxOption[]>([])
const localNetworksOptions = ref<NeComboboxOption[]>([])

const compressionOptions = [
  {
    id: 'disabled',
    label: t('standalone.openvpn_tunnel.disabled')
  },
  {
    id: 'lz0',
    label: 'LZ0'
  },
  {
    id: 'lz4',
    label: 'LZ4'
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

const tlsOptions = [
  {
    id: 'auto',
    label: t('standalone.openvpn_tunnel.auto')
  },
  {
    id: '1.1',
    label: '1.1'
  },
  {
    id: '1.2',
    label: '1.2'
  }
]

async function fetchOptions() {
  try {
    loading.value = true
    cipherOptions.value = [
      {
        id: 'auto',
        label: t('standalone.openvpn_tunnel.auto'),
        description: `(${t('standalone.openvpn_tunnel.server_client_negotiation')})`
      },
      ...(await ubusCall('ns.ovpntunnel', 'list-cipher')).data.ciphers.map(
        (cipher: { name: string; description: string }) => ({
          id: cipher.name,
          label: cipher.name
        })
      )
    ]
    digestOptions.value = [
      {
        id: 'auto',
        label: t('standalone.openvpn_tunnel.auto'),
        description: `(${t('standalone.openvpn_tunnel.server_client_negotiation')})`
      },
      ...(await ubusCall('ns.ovpntunnel', 'list-digest')).data.digests.map(
        (digest: { name: string; description: string }) => ({
          id: digest.name,
          label: digest.name
        })
      )
    ]
    loading.value = false
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_tunnel_options')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
}

function cleanValidationErrors() {
  validationErrorBag.value.clear()
  remoteNetworksValidationErrors.value = []
  publicEndpointsValidationErrors.value = []
  remoteHostsValidationErrors.value = []
}

async function resetForm() {
  loading.value = true
  if (props.itemToEdit) {
    const tunnelData = props.isClientTunnel
      ? ((
          await ubusCall('ns.ovpntunnel', 'get-tunnel-client', {
            id: props.itemToEdit.id
          })
        ).data as ClientTunnelPayload)
      : ((
          await ubusCall('ns.ovpntunnel', 'get-tunnel-server', {
            id: props.itemToEdit.id
          })
        ).data as ServerTunnelPayload)

    id.value = tunnelData.id as string
    name.value = tunnelData.ns_name
    enabled.value = tunnelData.enabled === '1'
    port.value = tunnelData.port
    protocol.value = tunnelData.proto
    localP2pIp.value = tunnelData.ifconfig_local ?? ''
    remoteP2pIp.value = tunnelData.ifconfig_remote ?? ''
    presharedKey.value = tunnelData.secret ?? ''
    topology.value = localP2pIp.value || remoteP2pIp.value || presharedKey.value ? 'p2p' : 'subnet'
    cipher.value = tunnelData.cipher ?? 'auto'
    digest.value = tunnelData.digest ?? 'auto'
    compression.value = tunnelData.compression ?? 'disabled'

    if (props.isClientTunnel) {
      const clientTunnelData = tunnelData as ClientTunnelPayload
      remoteHosts.value = clientTunnelData.remote
      remoteNetworks.value = clientTunnelData.route ?? ['']
      username.value = clientTunnelData.username ?? ''
      password.value = clientTunnelData.password ?? ''
      certificate.value = clientTunnelData.certificate ?? ''
      mode.value = clientTunnelData.dev_type === 'tun' ? 'routed' : 'bridged'
      authentication.value =
        username.value || password.value ? 'username_password_certificate' : 'certificate'
    } else {
      const serverTunnelData = tunnelData as ServerTunnelPayload
      remoteNetworks.value = serverTunnelData.remote ?? ['']
      localNetworks.value = serverTunnelData.local.map((x) => ({ id: x, label: x }))
      localNetworksOptions.value = serverTunnelData.local.map((x) => ({ id: x, label: x }))
      publicEndpoints.value = serverTunnelData.ns_public_ip
      vpnNetwork.value = serverTunnelData.server
    }
  } else {
    id.value = ''
    enabled.value = true
    name.value = ''
    remoteNetworks.value = ['']
    topology.value = 'subnet'
    protocol.value = 'udp'
    compression.value = 'disabled'
    digest.value = 'auto'
    cipher.value = 'auto'

    if (!props.isClientTunnel) {
      minimumTLSVersion.value = 'auto'
    } else {
      remoteHosts.value = ['']
      authentication.value = 'certificate'
      username.value = ''
      password.value = ''
      certificate.value = ''
      mode.value = 'bridged'
    }

    try {
      const defaultsPayload = (await ubusCall('ns.ovpntunnel', 'get-defaults'))
        .data as TunnelDefaults

      port.value = defaultsPayload.port.toString()
      localP2pIp.value = defaultsPayload.ifconfig_local
      remoteP2pIp.value = defaultsPayload.ifconfig_remote
      presharedKey.value = defaultsPayload.secret

      if (!props.isClientTunnel) {
        vpnNetwork.value = defaultsPayload.server
        publicEndpoints.value = defaultsPayload.remote
        const initialNetworkOptions = defaultsPayload.route.map((localNetwork) => ({
          id: localNetwork,
          label: localNetwork
        }))
        localNetworksOptions.value = [...initialNetworkOptions]
        localNetworks.value = [...initialNetworkOptions]
      }
    } catch (err: any) {
      error.value.notificationTitle = t('error.cannot_retrieve_tunnel_defaults')
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
    }
  }
  loading.value = false
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
  cleanValidationErrors()

  // populate NeMultiTextInput validation errors
  remoteNetworks.value.forEach(() => {
    remoteNetworksValidationErrors.value.push('')
  })
  remoteHosts.value.forEach(() => {
    remoteHostsValidationErrors.value.push('')
  })
  publicEndpoints.value.forEach(() => {
    publicEndpointsValidationErrors.value.push('')
  })

  const p2pValidators: [validationOutput[], string][] = [
    [[validateRequired(localP2pIp.value), validateIpAddress(localP2pIp.value)], 'localP2pIp'],
    [[validateRequired(remoteP2pIp.value), validateIpAddress(remoteP2pIp.value)], 'remoteP2pIp'],
    [[validateRequired(presharedKey.value)], 'presharedKey']
  ]

  // shared form fields validation
  const sharedFieldsValidators: [validationOutput[], string][] = [
    [[validateRequired(name.value)], 'name'],
    ...(topology.value === 'p2p' ? p2pValidators : [])
  ]

  const sharedFieldsValidatorsOk = sharedFieldsValidators
    .map(([validator, label]) => runValidators(validator, label))
    .every((result) => result)

  // remote networks validation
  let validRemoteNetworks = true
  for (let [index, remoteNetwork] of remoteNetworks.value.entries()) {
    const isRemoteNetworksOptional = props.isClientTunnel && topology.value == 'subnet'
    let validators = [
      ...(!isRemoteNetworksOptional ? [validateRequired(remoteNetwork)] : []),
      validateIp4Cidr(remoteNetwork)
    ]
    for (let validator of validators) {
      if (!validator.valid && (!isRemoteNetworksOptional || remoteNetwork != '')) {
        remoteNetworksValidationErrors.value[index] = t(validator.errMessage as string)
        validRemoteNetworks = false
        break
      }
    }
  }

  let specificFieldsValidatorsOk = true

  if (props.isClientTunnel) {
    const usernamePasswordValidators: [validationOutput[], string][] = [
      [[validateRequired(username.value)], 'username'],
      [[validateRequired(password.value)], 'password']
    ]

    // client form fields validation
    const clientTunnelFieldsValidators: [validationOutput[], string][] = [
      [[validateRequired(port.value), validatePort(port.value)], 'port'],
      [[validateRequired(certificate.value)], 'certificate'],
      ...(authentication.value === 'username_password_certificate'
        ? usernamePasswordValidators
        : [])
    ]

    // remote hosts validation
    let validRemoteHosts = true
    for (let [index, remoteHost] of remoteHosts.value.entries()) {
      let validators = [validateRequired(remoteHost), validateIpAddress(remoteHost)]
      for (let validator of validators) {
        if (!validator.valid) {
          remoteHostsValidationErrors.value[index] = t(validator.errMessage as string)
          validRemoteHosts = false
          break
        }
      }
    }

    specificFieldsValidatorsOk =
      clientTunnelFieldsValidators
        .map(([validator, label]) => runValidators(validator, label))
        .every((result) => result) && validRemoteHosts
  } else {
    // server form fields validation
    const localNetworksCidrValidation = localNetworks.value.map((x) => validateIp4Cidr(x.id))
    const serverTunnelFieldsValidators: [validationOutput[], string][] = [
      [[validateRequired(port.value), validatePort(port.value)], 'port'],
      [[validateRequired(vpnNetwork.value), validateIp4Cidr(vpnNetwork.value)], 'vpnNetwork'],
      [
        [
          validateRequiredOption(localNetworks.value),
          localNetworksCidrValidation.find((x) => !x.valid) ?? { valid: true }
        ],
        'localNetworks'
      ]
    ]

    // public endpoints validation
    let validPublicEndpoints = true
    for (let [index, publicEndpoint] of publicEndpoints.value.entries()) {
      let validators = [validateRequired(publicEndpoint), validateIpAddress(publicEndpoint)]
      for (let validator of validators) {
        if (!validator.valid) {
          publicEndpointsValidationErrors.value[index] = t(validator.errMessage as string)
          validPublicEndpoints = false
          break
        }
      }
    }

    specificFieldsValidatorsOk =
      serverTunnelFieldsValidators
        .map(([validator, label]) => runValidators(validator, label))
        .every((result) => result) && validPublicEndpoints
  }

  return sharedFieldsValidatorsOk && specificFieldsValidatorsOk && validRemoteNetworks
}

async function createOrEditTunnel() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  const isEditing = id.value != ''

  try {
    isSavingChanges.value = true
    if (validate()) {
      let sharedPayload: SharedTunnelPayload = {
        ...(isEditing ? { id: id.value } : {}),
        ns_name: name.value,
        port: port.value,
        proto: protocol.value,
        compression: compression.value === 'disabled' ? '' : compression.value,
        enabled: enabled.value ? '1' : '0',
        digest: digest.value === 'auto' ? '' : digest.value,
        remote: [],
        cipher: cipher.value === 'auto' ? '' : cipher.value,
        ...(topology.value === 'subnet'
          ? {}
          : {
              ifconfig_local: localP2pIp.value,
              ifconfig_remote: remoteP2pIp.value,
              secret: presharedKey.value
            })
      }

      if (props.isClientTunnel) {
        const requestType = isEditing ? 'edit-client' : 'add-client'

        const payload: ClientTunnelPayload = {
          ...sharedPayload,
          ...(topology.value === 'subnet'
            ? {
                certificate: certificate.value,
                ...(authentication.value === 'username_password_certificate'
                  ? {
                      username: username.value,
                      password: password.value
                    }
                  : {})
              }
            : {}),
          dev_type: mode.value == 'bridged' ? 'tun' : 'tap',
          remote: remoteHosts.value,
          route: remoteNetworks.value.filter(Boolean)
        }

        await ubusCall('ns.ovpntunnel', requestType, payload)
      } else {
        const requestType = isEditing ? 'edit-server' : 'add-server'

        const payload: ServerTunnelPayload = {
          ...sharedPayload,
          local: localNetworks.value.map((option) => option.id),
          topology: topology.value,
          ns_public_ip: publicEndpoints.value,
          tls_version_min: minimumTLSVersion.value === 'auto' ? '' : minimumTLSVersion.value,
          server: vpnNetwork.value,
          remote: remoteNetworks.value
        }

        await ubusCall('ns.ovpntunnel', requestType, payload)
      }
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
  cleanValidationErrors()
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  emit('close')
}

watch(
  () => [props.isClientTunnel, topology.value],
  () => {
    // clean remote network errors if topology is changed in client tunnel
    // (since validators change depending on topology)
    if (props.isClientTunnel) {
      remoteNetworksValidationErrors.value = []
    }
  }
)

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      fetchOptions().then(() => {
        resetForm()
      })
    }
  }
)
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="close()"
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
    :title="
      id
        ? isClientTunnel
          ? t('standalone.openvpn_tunnel.edit_client_tunnel')
          : t('standalone.openvpn_tunnel.edit_server_tunnel')
        : isClientTunnel
        ? t('standalone.openvpn_tunnel.add_client_tunnel')
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
    <NeSkeleton :lines="20" v-if="loading" />
    <div class="flex flex-col gap-y-6" v-else>
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
          :invalid-messages="publicEndpointsValidationErrors"
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
          type="number"
          :label="t('standalone.openvpn_tunnel.port')"
          :invalid-message="validationErrorBag.getFirstFor('port')"
        />
        <NeCombobox
          :label="t('standalone.openvpn_tunnel.local_networks')"
          :placeholder="t('standalone.openvpn_tunnel.choose_network')"
          :multiple="true"
          :options="localNetworksOptions"
          v-model="localNetworks"
          :invalid-message="validationErrorBag.getFirstFor('localNetworks')"
          :no-options-label="t('ne_combobox.no_options_label')"
          :no-results-label="t('ne_combobox.no_results')"
          :show-selected-label="true"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :accept-user-input="true"
          ><template #tooltip>
            <NeTooltip
              ><template #content>{{
                t('standalone.openvpn_tunnel.local_networks_tooltip')
              }}</template></NeTooltip
            >
          </template></NeCombobox
        >
        <NeMultiTextInput
          v-model="remoteNetworks"
          :add-item-label="t('standalone.openvpn_tunnel.add_remote_address')"
          :title="t('standalone.openvpn_tunnel.remote_networks')"
          :invalid-messages="remoteNetworksValidationErrors"
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
          :invalid-messages="remoteHostsValidationErrors"
        />
        <NeTextInput
          v-model="port"
          type="number"
          :label="t('standalone.openvpn_tunnel.remote_port')"
          :invalid-message="validationErrorBag.getFirstFor('port')"
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
              :is-password="true"
              :label="t('standalone.openvpn_tunnel.password')"
              :invalid-message="validationErrorBag.getFirstFor('password')"
            />
          </template>
          <NeTextArea
            v-model="certificate"
            :label="t('standalone.openvpn_tunnel.certificate')"
            :invalid-message="validationErrorBag.getFirstFor('certificate')"
          />
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
        <NeMultiTextInput
          v-if="isClientTunnel"
          v-model="remoteNetworks"
          :add-item-label="t('standalone.openvpn_tunnel.add_remote_address')"
          :title="t('standalone.openvpn_tunnel.remote_networks')"
          :invalid-messages="remoteNetworksValidationErrors"
        />
        <NeTextArea
          v-model="presharedKey"
          :label="t('standalone.openvpn_tunnel.preshared_key')"
          :invalid-message="validationErrorBag.getFirstFor('presharedKey')"
        />
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
            v-if="topology != 'p2p'"
            v-model="remoteNetworks"
            :add-item-label="t('standalone.openvpn_tunnel.add_remote_address')"
            :title="t('standalone.openvpn_tunnel.extra_remote_networks')"
            optional
            :optional-label="t('common.optional')"
            :invalid-messages="remoteNetworksValidationErrors"
            ><template #tooltip>
              <NeTooltip
                ><template #content>{{
                  t('standalone.openvpn_tunnel.extra_remote_networks_tooltip')
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
          :no-options-label="t('ne_combobox.no_options_label')"
          :no-results-label="t('ne_combobox.no_results')"
          v-model="compression"
        />
        <NeCombobox
          :label="t('standalone.openvpn_tunnel.digest')"
          :options="digestOptions"
          :no-options-label="t('ne_combobox.no_options_label')"
          :no-results-label="t('ne_combobox.no_results')"
          v-model="digest"
        />
        <NeCombobox
          :label="t('standalone.openvpn_tunnel.cipher')"
          :options="cipherOptions"
          :no-options-label="t('ne_combobox.no_options_label')"
          :no-results-label="t('ne_combobox.no_results')"
          v-model="cipher"
        />
        <NeCombobox
          :label="t('standalone.openvpn_tunnel.enforce_minimum_tls_version')"
          :no-options-label="t('ne_combobox.no_options_label')"
          :no-results-label="t('ne_combobox.no_results')"
          :options="tlsOptions"
          v-model="minimumTLSVersion"
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
