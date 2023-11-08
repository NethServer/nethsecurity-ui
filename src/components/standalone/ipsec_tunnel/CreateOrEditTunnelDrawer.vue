<script setup lang="ts">
import {
  MessageBag,
  validateIp4Cidr,
  validateIpAddress,
  validateRequired,
  type validationOutput
} from '@/lib/validation'
import type { IpsecTunnel } from '@/views/standalone/vpn/IPsecTunnelView.vue'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import NeStepper from '../NeStepper.vue'
import {
  NeSideDrawer,
  NeSkeleton,
  NeButton,
  NeToggle,
  NeTextInput,
  NeCombobox,
  NeTooltip,
  NeRadioSelection,
  NeFormItemLabel,
  NeTitle,
  NeInlineNotification,
  type NeComboboxOption,
  getAxiosErrorMessage
} from '@nethserver/vue-tailwind-lib'
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
  notificationDescription: ''
})
const step = ref(1)
const validationErrorBag = ref(new MessageBag())
const localNetworksValidationErrors = ref<string[]>([])
const remoteNetworksValidationErrors = ref<string[]>([])

const id = ref('')
const generatedPresharedKey = ref('')

// Step 1 fields
const enabled = ref(true)
const name = ref('')
const wanIpAddress = ref('')
const remoteIpAddress = ref('')
const localNetworks = ref<string[]>([])
const remoteNetworks = ref<string[]>([])
const localIdentifier = ref('')
const remoteIdentifier = ref('')

// Step 2 fields
const presharedKeyMode = ref<'generate' | 'import'>('generate')
const presharedKey = ref('')
const dpd = ref(false)
const enableCompression = ref(false)

// Step 3 fields
const ikeVersion = ref('')
const ikeEncryptionAlgorithm = ref('')
const ikeIntegrityAlgorithm = ref('')
const ikeDiffieHellmanGroup = ref('')
const ikeKeyLifetime = ref('')
const espEncryptionAlgorithm = ref('')
const espIntegrityAlgorithm = ref('')
const espDiffieHellmanGroup = ref('')
const espKeyLifetime = ref('')

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
    label: t('standalone.ipsec_tunnel.generate_key'),
    icon: 'key'
  },
  {
    id: 'import',
    label: t('standalone.ipsec_tunnel.import_key'),
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
      label: x.name
    }))
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_ipsec_algorithms')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
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
    } catch (err: any) {
      error.value.notificationTitle = t('error.cannot_retrieve_tunnel_data')
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
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
    } catch (err: any) {
      error.value.notificationTitle = t('error.cannot_retrieve_tunnel_defaults')
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      throw err
    }
  }

  id.value = props.itemToEdit?.id ?? ''
  name.value = tunnelData?.ns_name ?? ''
  enabled.value = tunnelData ? tunnelData.enabled === '1' : true
  wanIpAddress.value = tunnelData?.local_ip ?? ''
  remoteIpAddress.value = tunnelData?.gateway ?? ''
  localNetworks.value = tunnelData?.local_subnet ?? []
  remoteNetworks.value = tunnelData?.remote_subnet ?? []
  dpd.value = tunnelData ? tunnelData.dpdaction == 'restart' : false
  enableCompression.value = tunnelData ? tunnelData.ipcomp === 'true' : false
  ikeVersion.value = tunnelData?.keyexchange ?? ''
  ikeEncryptionAlgorithm.value = tunnelData?.ike.encryption_algorithm ?? ''
  ikeIntegrityAlgorithm.value = tunnelData?.ike.hash_algorithm ?? ''
  ikeDiffieHellmanGroup.value = tunnelData?.ike.dh_group ?? ''
  ikeKeyLifetime.value = tunnelData?.ike.rekeytime ?? ''
  espEncryptionAlgorithm.value = tunnelData?.esp.encryption_algorithm ?? ''
  espIntegrityAlgorithm.value = tunnelData?.esp.hash_algorithm ?? ''
  espDiffieHellmanGroup.value = tunnelData?.esp.dh_group ?? ''
  espKeyLifetime.value = tunnelData?.esp.rekeytime ?? ''
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
      let validator = validateIp4Cidr(networkEntry)
      if (!validator.valid) {
        validationErrors[index] = t(validator.errMessage as string)
        validationResult = false
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
    const [localValidationResult, localValidationError] = validateNetworkFields(
      localNetworks.value,
      'localNetworks'
    )
    localNetworksValidationErrors.value = localValidationError

    const [remoteValidationResult, remoteValidationError] = validateNetworkFields(
      remoteNetworks.value,
      'remoteNetworks'
    )
    remoteNetworksValidationErrors.value = remoteValidationError

    const step1Validators: [validationOutput[], string][] = [
      [[validateRequired(name.value)], 'name'],
      [[validateRequired(wanIpAddress.value)], 'wanIpAddress'],
      [
        [validateRequired(remoteIpAddress.value), validateIpAddress(remoteIpAddress.value)],
        'remoteIpAddress'
      ],
      [[validateRequired(localIdentifier.value)], 'localIdentifier'],
      [[validateRequired(remoteIdentifier.value)], 'remoteIdentifier']
    ]

    return (
      step1Validators
        .map(([validator, label]) => runValidators(validator, label))
        .every((result) => result) &&
      localValidationResult &&
      remoteValidationResult
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
      [[validateRequired(ikeKeyLifetime.value)], 'ikeKeyLifetime'],
      [[validateRequired(espEncryptionAlgorithm.value)], 'espEncryptionAlgorithm'],
      [[validateRequired(espIntegrityAlgorithm.value)], 'espIntegrityAlgorithm'],
      [[validateRequired(espKeyLifetime.value)], 'espKeyLifetime']
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
    local_subnet: localNetworks.value.filter((x) => x != ''),
    gateway: remoteIpAddress.value,
    local_identifier: localIdentifier.value,
    remote_identifier: remoteIdentifier.value,
    local_ip: wanIpAddress.value,
    pre_shared_key:
      presharedKeyMode.value == 'import' ? presharedKey.value : generatedPresharedKey.value
  }

  if (isEditing) payload.id = id.value

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
  } finally {
    isSavingChanges.value = false
  }
}

function cleanValidationErrors() {
  validationErrorBag.value.clear()
  localNetworksValidationErrors.value = []
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
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
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
    />
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
        <NeMultiTextInput
          v-model="localNetworks"
          :add-item-label="t('standalone.ipsec_tunnel.add_network')"
          :title="t('standalone.ipsec_tunnel.local_networks')"
          :invalid-messages="localNetworksValidationErrors"
          :general-invalid-message="validationErrorBag.getFirstFor('localNetworks')"
          @add-item="validationErrorBag.delete('localNetworks')"
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
        <NeTitle level="h4">{{ t('standalone.ipsec_tunnel.phase_one_ike') }}</NeTitle>
        <NeCombobox
          v-model="ikeVersion"
          :label="t('standalone.ipsec_tunnel.ike_version')"
          :invalidMessage="validationErrorBag.getFirstFor('ikeVersion')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :options="ikeVersionOptions"
        />
        <NeCombobox
          v-model="ikeEncryptionAlgorithm"
          :label="t('standalone.ipsec_tunnel.encryption_algorithm')"
          :invalidMessage="validationErrorBag.getFirstFor('ikeEncryptionAlgorithm')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :options="encryptionOptions"
        />
        <NeCombobox
          v-model="ikeIntegrityAlgorithm"
          :label="t('standalone.ipsec_tunnel.integrity_algorithm')"
          :invalidMessage="validationErrorBag.getFirstFor('ikeIntegrityAlgorithm')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :options="integrityOptions"
        />
        <NeCombobox
          v-model="ikeDiffieHellmanGroup"
          :label="t('standalone.ipsec_tunnel.diffie_hellman_group')"
          :invalidMessage="validationErrorBag.getFirstFor('ikeDiffieHellmanGroup')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :options="diffieHellmanOptions"
        />
        <NeTextInput
          v-model="ikeKeyLifetime"
          type="number"
          :label="t('standalone.ipsec_tunnel.key_life_time_seconds')"
          :invalidMessage="validationErrorBag.getFirstFor('ikeKeyLifetime')"
        />
        <NeTitle level="h4">{{ t('standalone.ipsec_tunnel.phase_two_esp') }}</NeTitle>
        <NeCombobox
          v-model="espEncryptionAlgorithm"
          :label="t('standalone.ipsec_tunnel.encryption_algorithm')"
          :invalidMessage="validationErrorBag.getFirstFor('espEncryptionAlgorithm')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :options="encryptionOptions"
        />
        <NeCombobox
          v-model="espIntegrityAlgorithm"
          :label="t('standalone.ipsec_tunnel.integrity_algorithm')"
          :invalidMessage="validationErrorBag.getFirstFor('espIntegrityAlgorithm')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :options="integrityOptions"
        />
        <NeCombobox
          v-model="espDiffieHellmanGroup"
          :label="t('standalone.ipsec_tunnel.diffie_hellman_group')"
          :invalidMessage="validationErrorBag.getFirstFor('espDiffieHellmanGroup')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :options="diffieHellmanOptions"
        />
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
