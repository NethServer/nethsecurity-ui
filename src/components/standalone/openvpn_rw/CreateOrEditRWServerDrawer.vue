<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, watch, type Ref } from 'vue'
import {
  MessageBag,
  validateIp4Cidr,
  validateIpAddress,
  validateIpAddressOrFQDN,
  validatePort,
  validateRequired,
  type validationOutput,
  validateIp4Address
} from '@/lib/validation'
import {
  NeInlineNotification,
  NeSideDrawer,
  NeButton,
  NeTooltip,
  NeCombobox,
  NeSkeleton,
  type NeComboboxOption,
  NeFormItemLabel,
  NeRadioSelection,
  NeTextInput,
  getAxiosErrorMessage,
  focusElement
} from '@nethesis/vue-components'
import { NeToggle } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import type { RWServer } from '@/views/standalone/vpn/OpenvpnRoadWarriorView.vue'
import NeMultiTextInput, { type KeyValueItem } from '../NeMultiTextInput.vue'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'

const props = defineProps<{
  isShown: boolean
  itemToEdit?: RWServer
  instanceName?: string
}>()

const { t } = useI18n()

const emit = defineEmits(['close', 'add-edit-server'])

const loading = ref(false)
const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const validationErrorBag = ref(new MessageBag())
const publicIpOrHostnameValidationErrors = ref<string[]>([])
const pushCustomNetworkRoutesValidationErrors = ref<string[]>([])

const showAdvancedSettings = ref(false)

// form fields
const enabled = ref(true)
const name = ref('')
const nameRef = ref()
const userDatabase = ref('main')
const userDatabaseRef = ref()
const createAccountForAllUsers = ref(false)
const authMode = ref('username_password')
const mode = ref('routed')
const vpnNetwork = ref('')
const vpnNetworkRef = ref()
const publicIpOrHostname = ref<string[]>([])
const protocol = ref('udp')
const port = ref('')
const portRef = ref()
const routeTrafficThroughVpn = ref(false)
const pushCustomNetworkRoutes = ref<string[]>([])
const clientToClientNetworkTraffic = ref(false)
const compression = ref('disabled')
const digest = ref('auto')
const cipher = ref('auto')
const minimumTLSVersion = ref('auto')
const bridge = ref('')
const bridgeRef = ref()
const rangeIpStart = ref('')
const rangeIpStartRef = ref()
const rangeIpEnd = ref('')
const rangeIpEndRef = ref()
const dynamicRangeIpStart = ref('')
const dynamicRangeIpStartRef = ref()
const dynamicRangeIpEnd = ref('')
const dynamicRangeIpEndRef = ref()

const customOptions = ref<KeyValueItem[]>([])
const digestOptions = ref<NeComboboxOption[]>([])
const cipherOptions = ref<NeComboboxOption[]>([])
const authModeOptions = ref<NeComboboxOption[]>([])
const bridgesOptions = ref<NeComboboxOption[]>([])
const userDatabaseOptions = ref<NeComboboxOption[]>([])
const availableCustomOptions = ref<NeComboboxOption[]>([])

const compressionOptions = [
  {
    id: 'disabled',
    label: t('common.disabled')
  },
  {
    id: 'lzo',
    label: 'LZO'
  },
  {
    id: 'lz4',
    label: 'LZ4'
  }
]

const modeOptions = [
  {
    id: 'routed',
    label: t('standalone.openvpn_rw.routed')
  },
  {
    id: 'bridged',
    label: t('standalone.openvpn_rw.bridged')
  }
]

const protocolOptions = [
  {
    id: 'udp',
    label: t('standalone.openvpn_rw.udp')
  },
  {
    id: 'tcp',
    label: t('standalone.openvpn_rw.tcp')
  }
]

const tlsOptions = [
  {
    id: 'auto',
    label: t('standalone.openvpn_rw.auto')
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

// contains the first invalid field ref
const firstErrorRef = ref()

async function fetchOptions() {
  try {
    loading.value = true
    cipherOptions.value = [
      // Default value for the cipher option (auto)
      {
        id: 'auto',
        label: t('standalone.openvpn_rw.auto'),
        description: `(${t('standalone.openvpn_rw.server_client_negotiation')})`
      },
      // List containing the available ciphers returned from the ns.ovpnrw service, mapped into NeCombobox options
      ...(await ubusCall('ns.ovpnrw', 'list-cipher')).data.ciphers.map(
        (cipher: { name: string; description: string }) => ({
          id: cipher.name,
          label: cipher.name,
          description: '(' + t('standalone.openvpn_rw.' + cipher.description) + ')'
        })
      )
    ]
    digestOptions.value = [
      // Default value for the digest option (auto)
      {
        id: 'auto',
        label: t('standalone.openvpn_rw.auto'),
        description: `(${t('standalone.openvpn_rw.server_client_negotiation')})`
      },
      // List containing the available digests returned from the ns.ovpnrw service, mapped into NeCombobox options
      ...(await ubusCall('ns.ovpnrw', 'list-digest')).data.digests.map(
        (digest: { name: string; description: string }) => ({
          id: digest.name,
          label: digest.name,
          description: '(' + t('standalone.openvpn_rw.' + digest.description) + ')'
        })
      )
    ]
    authModeOptions.value = (await ubusCall('ns.ovpnrw', 'list-auth-modes')).data.options.map(
      (authMode: string) => ({
        id: authMode,
        label: t(`standalone.openvpn_rw.${authMode}`)
      })
    )
    userDatabaseOptions.value = (await ubusCall('ns.users', 'list-databases')).data.databases.map(
      (userDatabase: { name: string; description: string }) => ({
        id: userDatabase.name,
        label:
          userDatabase.name === 'main'
            ? t('standalone.openvpn_rw.local_database')
            : userDatabase.name,
        description: userDatabase.description
      })
    )
    availableCustomOptions.value = (
      await ubusCall('ns.ovpnrw', 'list-dhcp-options')
    ).data.options.map((option: string) => ({
      id: option,
      label: option
    }))
    bridgesOptions.value = (await ubusCall('ns.ovpnrw', 'list-bridges')).data.bridges.map(
      (bridge: string) => ({
        id: bridge,
        label: bridge
      })
    )
    loading.value = false
    focusElement(nameRef)
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_server_options')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}

function cleanValidationErrors() {
  validationErrorBag.value.clear()
  publicIpOrHostnameValidationErrors.value = []
  pushCustomNetworkRoutesValidationErrors.value = []
}

function resetForm() {
  const serverData = props.itemToEdit

  name.value = serverData?.ns_description ?? ''
  userDatabase.value = serverData?.ns_user_db ? serverData.ns_user_db : 'main'
  createAccountForAllUsers.value = false
  authMode.value = serverData?.ns_auth_mode ?? 'username_password'
  mode.value = serverData?.dev_type === 'tun' ? 'routed' : 'bridged'
  vpnNetwork.value = serverData?.server ?? ''
  dynamicRangeIpStart.value = serverData?.ifconfig_pool?.length ? serverData.ifconfig_pool[0] : ''
  dynamicRangeIpEnd.value = serverData?.ifconfig_pool?.length ? serverData.ifconfig_pool[1] : ''
  publicIpOrHostname.value = serverData?.ns_public_ip ?? []
  protocol.value = serverData?.proto ?? 'udp'
  port.value = serverData?.port ?? ''
  pushCustomNetworkRoutes.value = serverData?.ns_local ?? []
  compression.value = serverData?.compress ?? 'disabled'
  cipher.value = serverData?.cipher ?? 'auto'
  digest.value = serverData?.auth ?? 'auto'
  rangeIpStart.value = serverData?.ns_pool_start ?? ''
  rangeIpEnd.value = serverData?.ns_pool_end ?? ''
  bridge.value = serverData?.ns_bridge ?? bridgesOptions.value?.[0]?.id ?? ''
  minimumTLSVersion.value = serverData?.tls_version_min ?? 'auto'
  customOptions.value =
    serverData?.ns_dhcp_options.map((option) => ({ key: option.option, value: option.value })) ?? []

  if (serverData) {
    routeTrafficThroughVpn.value = serverData.ns_redirect_gateway === '1'
    clientToClientNetworkTraffic.value = serverData.client_to_client === '1'
    enabled.value = serverData.enabled === '1'
  } else {
    routeTrafficThroughVpn.value = false
    clientToClientNetworkTraffic.value = false
    enabled.value = true
  }
}

function runFieldValidators(
  validators: validationOutput[],
  fieldName: string,
  fieldRef: Ref<any>
): boolean {
  for (let validator of validators) {
    if (!validator.valid) {
      validationErrorBag.value.set(fieldName, [validator.errMessage as string])

      // remember the first field with error for focus management
      if (!firstErrorRef.value) {
        firstErrorRef.value = fieldRef
      }
    }
  }

  return validators.every((validator) => validator.valid)
}

function validateMultiTextFields(
  validators: ((value: string) => validationOutput)[],
  values: string[]
) {
  let validationErrorMessages: string[] = []
  values.forEach(() => {
    validationErrorMessages.push('')
  })

  for (let [index, value] of values.entries()) {
    for (let validator of validators) {
      const validationResult = validator(value)
      if (!validationResult.valid) {
        validationErrorMessages[index] = t(validationResult.errMessage as string)
        break
      }
    }
  }

  return validationErrorMessages
}

function validate() {
  cleanValidationErrors()

  let validPublicIpOrHostname = true
  let validPushCustomNetworkRoutes = true

  if (publicIpOrHostname.value.length == 0) {
    validationErrorBag.value.set('ns_public_ip', ['required'])
    validPublicIpOrHostname = false
  } else {
    publicIpOrHostnameValidationErrors.value = validateMultiTextFields(
      [validateRequired, validateIpAddressOrFQDN],
      publicIpOrHostname.value
    )
    validPublicIpOrHostname = publicIpOrHostnameValidationErrors.value.every((x) => x === '')
  }

  pushCustomNetworkRoutesValidationErrors.value = validateMultiTextFields(
    [validateRequired, validateIp4Cidr],
    pushCustomNetworkRoutes.value
  )
  validPushCustomNetworkRoutes = pushCustomNetworkRoutesValidationErrors.value.every(
    (x) => x === ''
  )

  const bridgedServerValidators: [validationOutput[], string, Ref<any>][] = [
    [
      [validateRequired(rangeIpStart.value), validateIpAddress(rangeIpStart.value)],
      'ns_pool_start',
      rangeIpStartRef
    ],
    [
      [validateRequired(rangeIpEnd.value), validateIpAddress(rangeIpEnd.value)],
      'ns_pool_end',
      rangeIpEndRef
    ],
    [[validateRequired(bridge.value)], 'ns_bridge', bridgeRef]
  ]

  const routedServerValidators: [validationOutput[], string, Ref<any>][] = [
    [
      [validateRequired(vpnNetwork.value), validateIp4Cidr(vpnNetwork.value)],
      'server',
      vpnNetworkRef
    ],
    [
      [validateRequired(dynamicRangeIpStart.value), validateIp4Address(dynamicRangeIpStart.value)],
      'ifconfig_pool_start',
      dynamicRangeIpStartRef
    ],
    [
      [validateRequired(dynamicRangeIpEnd.value), validateIp4Address(dynamicRangeIpEnd.value)],
      'ifconfig_pool_end',
      dynamicRangeIpEndRef
    ]
  ]

  const validators: [validationOutput[], string, Ref<any>][] = [
    [[validateRequired(name.value)], 'ns_description', nameRef],
    [[validateRequired(userDatabase.value)], 'ns_user_db', userDatabaseRef],
    [[validateRequired(port.value), validatePort(port.value)], 'port', portRef],
    ...(mode.value === 'bridged' ? bridgedServerValidators : routedServerValidators)
  ]

  // reset firstErrorRef for focus management
  firstErrorRef.value = undefined

  const isValidationOk =
    validators
      .map(([validators, fieldName, fieldRef]) =>
        runFieldValidators(validators, fieldName, fieldRef)
      )
      .every((result) => result) &&
    validPublicIpOrHostname &&
    validPushCustomNetworkRoutes

  if (firstErrorRef.value) {
    focusElement(firstErrorRef.value)
  }
  return isValidationOk
}

async function createOrEditServer() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  const isEditing = Boolean(props.itemToEdit?.ns_description)

  if (!validate()) {
    return
  }

  isSavingChanges.value = true

  // set new configuration for openvpn rw instance

  try {
    await ubusCall('ns.ovpnrw', 'set-configuration', {
      instance: props.instanceName,
      ns_description: name.value,
      enabled: enabled.value ? '1' : '0',
      ns_user_db: userDatabase.value,
      ns_auth_mode: authMode.value,
      dev_type: mode.value === 'routed' ? 'tun' : 'tap',
      server: mode.value === 'routed' ? vpnNetwork.value : '',
      ns_bridge: mode.value === 'bridged' ? bridge.value : '',
      ns_pool_start: mode.value === 'bridged' ? rangeIpStart.value : '',
      ns_pool_end: mode.value === 'bridged' ? rangeIpEnd.value : '',
      proto: protocol.value,
      ifconfig_pool:
        mode.value === 'routed' ? [dynamicRangeIpStart.value, dynamicRangeIpEnd.value] : [],
      ns_public_ip: publicIpOrHostname.value,
      port: port.value,
      ns_local: pushCustomNetworkRoutes.value,
      ns_redirect_gateway: routeTrafficThroughVpn.value ? '1' : '0',
      client_to_client: clientToClientNetworkTraffic.value ? '1' : '0',
      compress: compression.value === 'disabled' ? '' : compression.value,
      cipher: cipher.value === 'auto' ? '' : cipher.value,
      auth: digest.value === 'auto' ? '' : digest.value,
      tls_version_min: minimumTLSVersion.value === 'auto' ? '' : minimumTLSVersion.value,
      ns_dhcp_options: customOptions.value
        .filter((option) => option.key)
        .map((option) => ({
          option: option.key,
          value: option.value
        }))
    })
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationErrorBag.value = err.errorBag
    } else {
      error.value.notificationTitle = isEditing
        ? t('error.cannot_edit_server')
        : t('error.cannot_create_server')

      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    }
    isSavingChanges.value = false
    return
  }

  // import all users for new instance if specified by user
  try {
    if (!props.itemToEdit?.ns_description && createAccountForAllUsers.value) {
      await ubusCall('ns.ovpnrw', 'import-users', { instance: props.instanceName })
    }
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_import_users')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    return
  } finally {
    isSavingChanges.value = false
  }

  emit('add-edit-server')
  close()
}

function close() {
  if (!isSavingChanges.value) {
    cleanValidationErrors()
    error.value.notificationTitle = ''
    error.value.notificationDescription = ''
    error.value.notificationDetails = ''
    emit('close')
  }
}

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      showAdvancedSettings.value = false
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
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    :title="
      itemToEdit?.ns_description
        ? t('standalone.openvpn_rw.edit_server')
        : t('standalone.openvpn_rw.create_server')
    "
  >
    <NeInlineNotification
      v-if="error.notificationTitle"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
      ><template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <NeSkeleton :lines="20" v-if="loading" />
    <div class="flex flex-col gap-y-6" v-else>
      <div>
        <NeFormItemLabel>{{ t('standalone.openvpn_rw.status') }}</NeFormItemLabel>
        <NeToggle v-model="enabled" :label="enabled ? t('common.enabled') : t('common.disabled')" />
      </div>
      <NeTextInput
        v-model="name"
        :label="t('standalone.openvpn_rw.server_name')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('ns_description'))"
        ref="nameRef"
      />
      <NeCombobox
        :label="t('standalone.openvpn_rw.user_database')"
        :disabled="itemToEdit?.ns_description != '' || false"
        :options="userDatabaseOptions"
        :no-options-label="t('ne_combobox.no_options_label')"
        :no-results-label="t('ne_combobox.no_results')"
        :optionalLabel="t('common.optional')"
        v-model="userDatabase"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('ns_user_db'))"
        ref="userDatabaseRef"
      />
      <div v-if="!itemToEdit?.ns_description">
        <NeFormItemLabel
          >{{ t('standalone.openvpn_rw.create_accounts_for_all_users') }}
          <NeTooltip
            ><template #content>
              {{ t('standalone.openvpn_rw.create_accounts_for_all_users_tooltip') }}</template
            ></NeTooltip
          ></NeFormItemLabel
        >
        <NeToggle
          v-model="createAccountForAllUsers"
          :label="createAccountForAllUsers ? t('common.enabled') : t('common.disabled')"
        />
      </div>
      <NeCombobox
        :label="t('standalone.openvpn_rw.authentication_mode')"
        :options="authModeOptions"
        :no-options-label="t('ne_combobox.no_options_label')"
        :no-results-label="t('ne_combobox.no_results')"
        :optionalLabel="t('common.optional')"
        v-model="authMode"
      />
      <NeRadioSelection
        :label="t('standalone.openvpn_rw.mode')"
        :options="modeOptions"
        v-model="mode"
      />
      <template v-if="mode === 'bridged'">
        <NeCombobox
          :label="t('standalone.openvpn_rw.bridge')"
          :options="bridgesOptions"
          :no-options-label="t('ne_combobox.no_options_label')"
          :no-results-label="t('ne_combobox.no_results')"
          :optionalLabel="t('common.optional')"
          v-model="bridge"
          :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('ns_bridge'))"
          ref="bridgeRef"
        />
        <NeTextInput
          v-model="rangeIpStart"
          :label="t('standalone.openvpn_rw.range_ip_start')"
          :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('ns_pool_start'))"
          ref="rangeIpStartRef"
        />
        <NeTextInput
          v-model="rangeIpEnd"
          :label="t('standalone.openvpn_rw.range_ip_end')"
          :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('ns_pool_end'))"
          ref="rangeIpEndRef"
        />
      </template>
      <template v-else>
        <!-- routed mode -->
        <NeTextInput
          v-model="vpnNetwork"
          :label="t('standalone.openvpn_rw.vpn_network')"
          :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('server'))"
          ref="vpnNetworkRef"
          ><template #tooltip>
            <NeTooltip
              ><template #content>{{
                t('standalone.openvpn_rw.vpn_network_tooltip')
              }}</template></NeTooltip
            >
          </template></NeTextInput
        >
        <NeInlineNotification
          kind="info"
          :title="t('standalone.openvpn_rw.dynamic_range_ip')"
          :description="t('standalone.openvpn_rw.dynamic_range_ip_message')"
          :closeAriaLabel="t('common.close')"
          class="mt-2"
        />
        <NeTextInput
          v-model="dynamicRangeIpStart"
          :label="t('standalone.openvpn_rw.dynamic_range_ip_start')"
          :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('ifconfig_pool_start'))"
          ref="dynamicRangeIpStartRef"
        />
        <NeTextInput
          v-model="dynamicRangeIpEnd"
          :label="t('standalone.openvpn_rw.dynamic_range_ip_end')"
          :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('ifconfig_pool_end'))"
          ref="dynamicRangeIpEndRef"
        >
        </NeTextInput>
      </template>
      <NeMultiTextInput
        v-model="publicIpOrHostname"
        :add-item-label="t('standalone.openvpn_rw.add_public_ip_host')"
        :title="t('standalone.openvpn_rw.public_ip_hostname_unit')"
        :invalid-messages="publicIpOrHostnameValidationErrors"
        :general-invalid-message="t(validationErrorBag.getFirstI18nKeyFor('ns_public_ip'))"
      />
      <div>
        <NeButton kind="tertiary" @click="showAdvancedSettings = !showAdvancedSettings">
          {{ t('common.advanced_settings') }}
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
        <NeRadioSelection
          :label="t('standalone.openvpn_rw.protocol')"
          :options="protocolOptions"
          v-model="protocol"
        />
        <NeTextInput
          v-model="port"
          :label="t('standalone.openvpn_rw.port')"
          :invalid-message="t(validationErrorBag.getFirstFor('port'))"
          ref="portRef"
        />
        <div>
          <NeFormItemLabel>{{
            t('standalone.openvpn_rw.route_all_client_traffic_through_vpn')
          }}</NeFormItemLabel>
          <NeToggle
            v-model="routeTrafficThroughVpn"
            :label="routeTrafficThroughVpn ? t('common.enabled') : t('common.disabled')"
          />
        </div>
        <NeMultiTextInput
          v-model="pushCustomNetworkRoutes"
          :add-item-label="t('standalone.openvpn_rw.add_network')"
          :title="t('standalone.openvpn_rw.push_custom_network_routes')"
          :invalid-messages="pushCustomNetworkRoutesValidationErrors"
        />
        <div>
          <NeFormItemLabel>{{
            t('standalone.openvpn_rw.allow_client_to_client_network_traffic')
          }}</NeFormItemLabel>
          <NeToggle
            v-model="clientToClientNetworkTraffic"
            :label="clientToClientNetworkTraffic ? t('common.enabled') : t('common.disabled')"
          />
        </div>
        <NeCombobox
          :label="t('standalone.openvpn_rw.compression')"
          :options="compressionOptions"
          :no-options-label="t('ne_combobox.no_options_label')"
          :no-results-label="t('ne_combobox.no_results')"
          :optionalLabel="t('common.optional')"
          v-model="compression"
        />
        <NeCombobox
          :label="t('standalone.openvpn_rw.digest')"
          :options="digestOptions"
          :no-options-label="t('ne_combobox.no_options_label')"
          :no-results-label="t('ne_combobox.no_results')"
          :optionalLabel="t('common.optional')"
          v-model="digest"
        />
        <NeCombobox
          :label="t('standalone.openvpn_rw.cipher')"
          :options="cipherOptions"
          :no-options-label="t('ne_combobox.no_options_label')"
          :no-results-label="t('ne_combobox.no_results')"
          :optionalLabel="t('common.optional')"
          v-model="cipher"
        />
        <NeCombobox
          :label="t('standalone.openvpn_rw.enforce_minimum_tls_version')"
          :no-options-label="t('ne_combobox.no_options_label')"
          :no-results-label="t('ne_combobox.no_results')"
          :options="tlsOptions"
          :optionalLabel="t('common.optional')"
          v-model="minimumTLSVersion"
        />
        <NeMultiTextInput
          v-model="customOptions"
          :title="t('standalone.openvpn_rw.custom_dhcp_options')"
          :use-key-input="true"
          key-input-type="combobox"
          :add-item-label="t('standalone.openvpn_rw.add_option')"
          :optional="true"
          :optional-label="t('common.optional')"
          :key-options="availableCustomOptions"
          :key-input-placeholder="t('standalone.openvpn_rw.custom_option_combobox_placeholder')"
          ><template #tooltip>
            <NeTooltip>
              <template #content>
                {{ t('standalone.openvpn_rw.custom_dhcp_options_tooltip') }}
              </template>
            </NeTooltip>
          </template></NeMultiTextInput
        >
      </template>
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="createOrEditServer()"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{
            itemToEdit?.ns_description ? t('common.save') : t('standalone.openvpn_rw.create')
          }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
</template>
