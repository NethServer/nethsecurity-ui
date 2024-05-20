<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  MessageBag,
  validateHost,
  validateIp4Cidr,
  validatePositiveInteger,
  validateRequired,
  validateRequiredOption,
  type validationOutput
} from '@/lib/validation'
import type { IpsecTunnel } from '@/views/standalone/vpn/IPsecTunnelView.vue'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import NeStepper from '../NeStepper.vue'
import {
  NeCombobox,
  type NeComboboxOption,
  NeHeading,
  NeInlineNotification,
  NeButton,
  NeSideDrawer,
  NeSkeleton,
  NeTooltip,
  NeRadioSelection,
  NeFormItemLabel,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeToggle } from '@nethesis/vue-components'
import { ubusCall } from '@/lib/standalone/ubus'
import NeMultiTextInput from '../NeMultiTextInput.vue'
import NeCopyField from '../NeCopyField.vue'

const props = defineProps<{
  isShown: boolean
  itemToEdit: IpsecTunnel | null
}>()

type CreateEditIpsecTunnelPayload = {
  id?: string
  ike: {
    encryption_algorithm: string
    hash_algorithm: string
    dh_group: string
    rekeytime: string
  }
  esp: {
    encryption_algorithm: string
    hash_algorithm: string
    dh_group: string
    rekeytime: string
  }
  ipcomp: string
  dpdaction: 'restart' | 'none'
  remote_subnet: string[]
  local_subnet: string[]
  ns_name: string
  gateway: string
  keyexchange: string
  local_identifier: string
  local_ip: string
  enabled: '0' | '1'
  remote_identifier: string
  pre_shared_key: string
}

const { t } = useI18n()

const emit = defineEmits(['close', 'add-edit-tunnel'])

const loading = ref(false)
const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const step = ref(1)
const validationErrorBag = ref(new MessageBag())
const remoteNetworksValidationErrors = ref<string[]>([])
const localNetworksOptions = ref<NeComboboxOption[]>([])

const id = ref('')
const generatedPresharedKey = ref('')

// Step 1 fields
const enabled = ref(true)
const name = ref('')
const wanIpAddress = ref('')
const remoteIpAddress = ref('')
const localNetworks = ref<NeComboboxOption[]>([])
const remoteNetworks = ref<string[]>([''])
const localIdentifier = ref('')
const remoteIdentifier = ref('')

// Step 2 fields
const presharedKeyMode = ref<'generate' | 'import'>('generate')
const presharedKey = ref('')
const dpd = ref(false)
const enableCompression = ref(false)

// Step 3 fields
const ikeVersion = ref('')
const ikeEncryptionAlgorithm = ref('aes256')
const ikeIntegrityAlgorithm = ref('sha256')
const ikeDiffieHellmanGroup = ref('modp2048')
const ikeKeyLifetime = ref('3600')
const espEncryptionAlgorithm = ref('aes256')
const espIntegrityAlgorithm = ref('sha256')
const espDiffieHellmanGroup = ref('modp2048')
const espKeyLifetime = ref('3600')

// Form options
const ikeVersionOptions: NeComboboxOption[] = [
  {
    id: 'ike',
    label: 'IKEv1 & IKEv2'
  },
  {
    id: 'ikev1',
    label: 'IKEv1'
  },
  {
    id: 'ikev2',
    label: 'IKEv2'
  }
]
const presharedKeyOptions = [
  {
    id: 'generate',
    label: t('standalone.ipsec_tunnel.use_generated_key'),
    icon: 'key'
  },
  {
    id: 'import',
    label: t('standalone.ipsec_tunnel.use_custom_key'),
    icon: 'circle-arrow-up'
  }
]
const wanOptions = ref<NeComboboxOption[]>([])
const encryptionOptions = ref<NeComboboxOption[]>([])
const integrityOptions = ref<NeComboboxOption[]>([])
const diffieHellmanOptions = ref<NeComboboxOption[]>([])

async function fetchOptions() {
  try {
    const wansResponse = await ubusCall('ns.ipsectunnel', 'list-wans')
    wanOptions.value = wansResponse.data.wans.map((x: { device: string; ipaddr: string }) => ({
      id: x.ipaddr,
      description: x.device,
      label: x.ipaddr
    }))
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_wan_list')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    throw err
  }

  try {
    const algsResponse = await ubusCall('ns.ipsectunnel', 'list-algs')
    encryptionOptions.value = algsResponse.data.encryption.map(
      (x: { id: string; name: string }) => ({
        id: x.id,
        label: x.name
      })
    )
    integrityOptions.value = algsResponse.data.integrity.map((x: { id: string; name: string }) => ({
      id: x.id,
      label: x.name
    }))
    diffieHellmanOptions.value = algsResponse.data.dh.map((x: { id: string; name: string }) => ({
      id: x.id,
      label:
        x.name == '-' ? t('standalone.ipsec_tunnel.pfs_perfect_forward_secrecy_disabled') : x.name
    }))
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_ipsec_algorithms')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    throw err
  }
}

async function resetForm() {
  step.value = 1
  // tunnelData is null if there is no item to edit, otherwise it will contain the result from the get-tunnel call
  let tunnelData: CreateEditIpsecTunnelPayload | null = null

  if (props.itemToEdit) {
    try {
      tunnelData = (
        await ubusCall('ns.ipsectunnel', 'get-tunnel', {
          id: props.itemToEdit.id
        })
      ).data as CreateEditIpsecTunnelPayload

      localIdentifier.value = tunnelData.local_identifier
      remoteIdentifier.value = tunnelData.remote_identifier
      presharedKey.value = tunnelData.pre_shared_key
      presharedKeyMode.value = 'import'

      const tunnelLocalNetworks = tunnelData?.local_subnet.map((x) => ({ id: x, label: x }))
      localNetworks.value = [...tunnelLocalNetworks]
      localNetworksOptions.value = [...tunnelLocalNetworks]
    } catch (err: any) {
      error.value.notificationTitle = t('error.cannot_retrieve_tunnel_data')
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
      throw err
    }
  } else {
    try {
      // get default values if tunnel is being added
      const defaultsResponse = await ubusCall('ns.ipsectunnel', 'get-defaults')
      localIdentifier.value = defaultsResponse.data.local_identifier
      remoteIdentifier.value = defaultsResponse.data.remote_identifier
      generatedPresharedKey.value = defaultsResponse.data.pre_shared_key
      presharedKeyMode.value = 'generate'
      presharedKey.value = ''

      const defaultLocalNetworks = defaultsResponse.data.local_networks.map((x: string) => ({
        id: x,
        label: x
      }))
      localNetworksOptions.value = [...defaultLocalNetworks]
      localNetworks.value = [...defaultLocalNetworks]
    } catch (err: any) {
      error.value.notificationTitle = t('error.cannot_retrieve_tunnel_defaults')
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
      throw err
    }
  }

  id.value = props.itemToEdit?.id ?? ''
  name.value = tunnelData?.ns_name ?? ''
  enabled.value = tunnelData ? tunnelData.enabled === '1' : true
  wanIpAddress.value = tunnelData?.local_ip ?? ''
  remoteIpAddress.value = tunnelData?.gateway ?? ''
  remoteNetworks.value = tunnelData?.remote_subnet ?? ['']
  dpd.value = tunnelData ? tunnelData.dpdaction == 'restart' : false
  enableCompression.value = tunnelData ? tunnelData.ipcomp === 'true' : false
  ikeVersion.value = tunnelData?.keyexchange ?? ikeVersionOptions[0].id
  ikeEncryptionAlgorithm.value = tunnelData?.ike.encryption_algorithm ?? 'aes256'
  ikeIntegrityAlgorithm.value = tunnelData?.ike.hash_algorithm ?? 'sha256'
  ikeDiffieHellmanGroup.value = tunnelData?.ike.dh_group ?? 'modp2048'
  ikeKeyLifetime.value = tunnelData?.ike.rekeytime ?? '3600'
  espEncryptionAlgorithm.value = tunnelData?.esp.encryption_algorithm ?? 'aes256'
  espIntegrityAlgorithm.value = tunnelData?.esp.hash_algorithm ?? 'sha256'
  espDiffieHellmanGroup.value = tunnelData?.esp.dh_group ?? 'modp2048'
  espKeyLifetime.value = tunnelData?.esp.rekeytime ?? '3600'
}

function runValidators(validators: validationOutput[], label: string): boolean {
  for (let validator of validators) {
    if (!validator.valid) {
      validationErrorBag.value.set(label, [t(validator.errMessage as string)])
    }
  }

  return validators.every((validator) => validator.valid)
}

function validateNetworkFields(
  networkList: string[],
  validationBagKey: string
): [boolean, string[]] {
  let validationErrors = []
  let validationResult = true
  networkList.forEach(() => {
    validationErrors.push('')
  })

  if (networkList.length == 0) {
    validationErrorBag.value.set(validationBagKey, [t('error.required')])
    return [false, []]
  }

  for (let [index, networkEntry] of networkList.entries()) {
    if (networkEntry) {
      // check ipv4 cidr
      let validator = validateIp4Cidr(networkEntry)
      if (!validator.valid) {
        validationErrors[index] = t(validator.errMessage as string)
        validationResult = false
      } else {
        // check if remote network is already in local networks
        if (localNetworks.value.find((x) => x.id === networkEntry)) {
          validationErrors[index] = t(
            'standalone.ipsec_tunnel.ipsec_network_already_used_in_local_networks'
          )
          validationResult = false
        }
      }
    } else {
      validationErrors[index] = t('error.required')
      validationResult = false
    }
  }

  return [validationResult, validationErrors]
}

function validateFormByStep(step: number): boolean {
  if (step == 1) {
    const [remoteValidationResult, remoteValidationError] = validateNetworkFields(
      remoteNetworks.value,
      'remoteNetworks'
    )
    remoteNetworksValidationErrors.value = remoteValidationError

    const localNetworksCidrValidation = localNetworks.value.map((x) => validateIp4Cidr(x.id))

    const step1Validators: [validationOutput[], string][] = [
      [[validateRequired(name.value)], 'name'],
      [[validateRequired(wanIpAddress.value)], 'wanIpAddress'],
      [
        [validateRequired(remoteIpAddress.value), validateHost(remoteIpAddress.value)],
        'remoteIpAddress'
      ],
      [
        [
          validateRequiredOption(localNetworks.value),
          localNetworksCidrValidation.find((x) => !x.valid) ?? { valid: true }
        ],
        'localNetworks'
      ],
      [[validateRequired(localIdentifier.value)], 'localIdentifier'],
      [[validateRequired(remoteIdentifier.value)], 'remoteIdentifier']
    ]

    return (
      step1Validators
        .map(([validator, label]) => runValidators(validator, label))
        .every((result) => result) && remoteValidationResult
    )
  } else if (step == 2) {
    if (presharedKeyMode.value === 'generate') {
      return true
    } else {
      const validator = validateRequired(presharedKey.value)
      if (!validator.valid) {
        validationErrorBag.value.set('presharedKey', [t(validator.errMessage as string)])
        return false
      }
      return true
    }
  } else {
    const step3Validators: [validationOutput[], string][] = [
      [[validateRequired(ikeVersion.value)], 'ikeVersion'],
      [[validateRequired(ikeEncryptionAlgorithm.value)], 'ikeEncryptionAlgorithm'],
      [[validateRequired(ikeIntegrityAlgorithm.value)], 'ikeIntegrityAlgorithm'],
      [
        [validateRequired(ikeKeyLifetime.value), validatePositiveInteger(ikeKeyLifetime.value)],
        'ikeKeyLifetime'
      ],
      [[validateRequired(espEncryptionAlgorithm.value)], 'espEncryptionAlgorithm'],
      [[validateRequired(espIntegrityAlgorithm.value)], 'espIntegrityAlgorithm'],
      [
        [validateRequired(espKeyLifetime.value), validatePositiveInteger(espKeyLifetime.value)],
        'espKeyLifetime'
      ]
    ]

    return step3Validators
      .map(([validator, label]) => runValidators(validator, label))
      .every((result) => result)
  }
}

function handleNextStep() {
  cleanValidationErrors()
  if (validateFormByStep(step.value)) {
    if (step.value == 3) {
      createOrEditTunnel()
    } else {
      step.value++
    }
  }
}

function handlePreviousStep() {
  if (step.value == 1) {
    close()
  } else {
    step.value--
  }
}

async function createOrEditTunnel() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  const isEditing = id.value != ''
  const requestType = isEditing ? 'edit-tunnel' : 'add-tunnel'
  const payload: CreateEditIpsecTunnelPayload = {
    ns_name: name.value,
    ike: {
      hash_algorithm: ikeIntegrityAlgorithm.value,
      encryption_algorithm: ikeEncryptionAlgorithm.value,
      dh_group: ikeDiffieHellmanGroup.value,
      rekeytime: ikeKeyLifetime.value
    },
    esp: {
      hash_algorithm: espIntegrityAlgorithm.value,
      encryption_algorithm: espEncryptionAlgorithm.value,
      dh_group: espDiffieHellmanGroup.value,
      rekeytime: espKeyLifetime.value
    },
    ipcomp: enableCompression.value ? 'true' : 'false',
    enabled: enabled.value ? '1' : '0',
    dpdaction: dpd.value ? 'restart' : 'none',
    keyexchange: ikeVersion.value,
    remote_subnet: remoteNetworks.value.filter((x) => x != ''),
    local_subnet: localNetworks.value.filter((x) => x.id != '').map((x) => x.id),
    gateway: remoteIpAddress.value,
    local_identifier: localIdentifier.value,
    remote_identifier: remoteIdentifier.value,
    local_ip: wanIpAddress.value,
    pre_shared_key:
      presharedKeyMode.value == 'import' ? presharedKey.value : generatedPresharedKey.value
  }

  if (isEditing) {
    payload.id = id.value
  }

  try {
    isSavingChanges.value = true
    await ubusCall('ns.ipsectunnel', requestType, payload)
    emit('add-edit-tunnel')
    close()
  } catch (err: any) {
    error.value.notificationTitle = isEditing
      ? t('error.cannot_edit_tunnel')
      : t('error.cannot_create_tunnel')

    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    isSavingChanges.value = false
  }
}

function cleanValidationErrors() {
  validationErrorBag.value.clear()
  remoteNetworksValidationErrors.value = []
}

function close() {
  cleanValidationErrors()
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  emit('close')
}

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      loading.value = true
      fetchOptions().then(() => {
        resetForm().then(() => {
          loading.value = false
        })
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
      id
        ? t('standalone.ipsec_tunnel.edit_ipsec_tunnel')
        : t('standalone.ipsec_tunnel.add_ipsec_tunnel')
    "
  >
    <NeInlineNotification
      v-if="error.notificationTitle"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
    >
      <template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <NeSkeleton :lines="20" v-if="loading" />
    <div class="flex flex-col gap-y-6" v-else>
      <NeStepper :currentStep="step" :totalSteps="3" :stepLabel="t('common.step')" />
      <template v-if="step == 1">
        <div>
          <NeFormItemLabel>{{ t('standalone.ipsec_tunnel.status') }}</NeFormItemLabel>
          <NeToggle
            :label="
              enabled ? t('standalone.ipsec_tunnel.enabled') : t('standalone.ipsec_tunnel.disabled')
            "
            v-model="enabled"
          />
        </div>
        <NeTextInput
          v-model="name"
          :disabled="id != ''"
          :label="t('standalone.ipsec_tunnel.tunnel_name')"
          :invalidMessage="validationErrorBag.getFirstFor('name')"
        />
        <NeCombobox
          v-model="wanIpAddress"
          :label="t('standalone.ipsec_tunnel.wan_ip_address')"
          :placeholder="t('standalone.ipsec_tunnel.choose_wan')"
          :invalidMessage="validationErrorBag.getFirstFor('wanIpAddress')"
          :options="wanOptions"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optionalLabel="t('common.optional')"
        />
        <NeTextInput
          v-model="remoteIpAddress"
          :label="t('standalone.ipsec_tunnel.remote_ip_address')"
          :invalidMessage="validationErrorBag.getFirstFor('remoteIpAddress')"
          ><template #tooltip>
            <NeTooltip
              ><template #content>{{
                t('standalone.ipsec_tunnel.remote_ip_address_tooltip')
              }}</template></NeTooltip
            >
          </template>
        </NeTextInput>
        <NeCombobox
          :label="t('standalone.ipsec_tunnel.local_networks')"
          :placeholder="t('standalone.ipsec_tunnel.choose_network')"
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
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :optionalLabel="t('common.optional')"
        />
        <NeMultiTextInput
          v-model="remoteNetworks"
          :add-item-label="t('standalone.ipsec_tunnel.add_network')"
          :title="t('standalone.ipsec_tunnel.remote_networks')"
          :invalid-messages="remoteNetworksValidationErrors"
          :general-invalid-message="validationErrorBag.getFirstFor('remoteNetworks')"
          @add-item="validationErrorBag.delete('remoteNetworks')"
        />
        <NeTextInput
          v-model="localIdentifier"
          :label="t('standalone.ipsec_tunnel.local_identifier')"
          :invalidMessage="validationErrorBag.getFirstFor('localIdentifier')"
          ><template #tooltip>
            <NeTooltip
              ><template #content>{{
                t('standalone.ipsec_tunnel.local_identifier_tooltip')
              }}</template></NeTooltip
            >
          </template>
        </NeTextInput>
        <NeTextInput
          v-model="remoteIdentifier"
          :label="t('standalone.ipsec_tunnel.remote_identifier')"
          :invalidMessage="validationErrorBag.getFirstFor('remoteIdentifier')"
        />
      </template>
      <template v-else-if="step == 2">
        <NeRadioSelection
          v-if="!id"
          :label="t('standalone.ipsec_tunnel.pre_shared_key')"
          :options="presharedKeyOptions"
          v-model="presharedKeyMode"
          :card="true"
          :grid-style="'grid-cols-1 sm:grid-cols-2 gap-3'"
        />

        <NeTextInput
          v-model="presharedKey"
          :invalidMessage="validationErrorBag.getFirstFor('presharedKey')"
          :label="id ? t('standalone.ipsec_tunnel.pre_shared_key') : ''"
          v-if="presharedKeyMode == 'import'"
        />
        <NeCopyField v-else :value="generatedPresharedKey" />

        <div>
          <NeFormItemLabel>{{
            t('standalone.ipsec_tunnel.dpd_dead_peer_detection')
          }}</NeFormItemLabel>
          <NeToggle
            :label="
              dpd ? t('standalone.ipsec_tunnel.enabled') : t('standalone.ipsec_tunnel.disabled')
            "
            v-model="dpd"
          />
        </div>
        <div>
          <NeFormItemLabel>{{ t('standalone.ipsec_tunnel.compression') }}</NeFormItemLabel>
          <NeToggle
            :label="
              enableCompression
                ? t('standalone.ipsec_tunnel.enabled')
                : t('standalone.ipsec_tunnel.disabled')
            "
            v-model="enableCompression"
          />
        </div>
      </template>
      <template v-else>
        <NeHeading tag="h6" class="mb-1.5">{{
          t('standalone.ipsec_tunnel.phase_one_ike')
        }}</NeHeading>
        <NeCombobox
          v-model="ikeVersion"
          :label="t('standalone.ipsec_tunnel.ike_version')"
          :invalidMessage="validationErrorBag.getFirstFor('ikeVersion')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :options="ikeVersionOptions"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optionalLabel="t('common.optional')"
        />
        <NeCombobox
          v-model="ikeEncryptionAlgorithm"
          :label="t('standalone.ipsec_tunnel.encryption_algorithm')"
          :invalidMessage="validationErrorBag.getFirstFor('ikeEncryptionAlgorithm')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :options="encryptionOptions"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optionalLabel="t('common.optional')"
        />
        <NeCombobox
          v-model="ikeIntegrityAlgorithm"
          :label="t('standalone.ipsec_tunnel.integrity_algorithm')"
          :invalidMessage="validationErrorBag.getFirstFor('ikeIntegrityAlgorithm')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :options="integrityOptions"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optionalLabel="t('common.optional')"
        />
        <NeCombobox
          v-model="ikeDiffieHellmanGroup"
          :label="t('standalone.ipsec_tunnel.diffie_hellman_group')"
          :invalidMessage="validationErrorBag.getFirstFor('ikeDiffieHellmanGroup')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :options="diffieHellmanOptions.filter((x) => x.id != '')"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optionalLabel="t('common.optional')"
        />
        <NeTextInput
          v-model="ikeKeyLifetime"
          type="number"
          :label="t('standalone.ipsec_tunnel.key_life_time_seconds')"
          :invalidMessage="validationErrorBag.getFirstFor('ikeKeyLifetime')"
        />
        <NeHeading tag="h6" class="mb-1.5">{{
          t('standalone.ipsec_tunnel.phase_two_esp')
        }}</NeHeading>
        <NeCombobox
          v-model="espEncryptionAlgorithm"
          :label="t('standalone.ipsec_tunnel.encryption_algorithm')"
          :invalidMessage="validationErrorBag.getFirstFor('espEncryptionAlgorithm')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :options="encryptionOptions"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optionalLabel="t('common.optional')"
        />
        <NeCombobox
          v-model="espIntegrityAlgorithm"
          :label="t('standalone.ipsec_tunnel.integrity_algorithm')"
          :invalidMessage="validationErrorBag.getFirstFor('espIntegrityAlgorithm')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :options="integrityOptions"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optionalLabel="t('common.optional')"
        />
        <NeCombobox
          v-model="espDiffieHellmanGroup"
          :label="t('standalone.ipsec_tunnel.diffie_hellman_group_pfs')"
          :invalidMessage="validationErrorBag.getFirstFor('espDiffieHellmanGroup')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :options="diffieHellmanOptions"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optionalLabel="t('common.optional')"
        >
          <template #tooltip>
            <NeTooltip>
              <template #content>
                {{ t('standalone.ipsec_tunnel.diffie_hellman_group_tooltip') }}
              </template>
            </NeTooltip>
          </template>
        </NeCombobox>
        <NeTextInput
          v-model="espKeyLifetime"
          type="number"
          :label="t('standalone.ipsec_tunnel.key_life_time_seconds')"
          :invalidMessage="validationErrorBag.getFirstFor('espKeyLifetime')"
        />
      </template>
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="handlePreviousStep">{{
          step == 1 ? t('common.cancel') : t('common.previous')
        }}</NeButton>
        <NeButton
          kind="primary"
          @click="handleNextStep"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{
            step === 3
              ? id
                ? t('common.save')
                : t('standalone.ipsec_tunnel.add_tunnel')
              : t('common.next')
          }}</NeButton
        >
      </div>
    </div>
  </NeSideDrawer>
</template>
