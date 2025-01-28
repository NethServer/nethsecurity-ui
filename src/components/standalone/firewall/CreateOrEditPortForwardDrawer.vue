<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeCombobox,
  type NeComboboxOption,
  NeInlineNotification,
  NeSideDrawer,
  NeButton,
  NeSkeleton,
  NeTooltip,
  NeFormItemLabel,
  NeTextInput,
  NeRadioSelection,
  NeExpandable,
  getAxiosErrorMessage,
  focusElement
} from '@nethesis/vue-components'
import { NeToggle } from '@nethesis/vue-components'
import { toRefs, ref, watch, type Ref } from 'vue'
import type {
  CreateEditPortForwardPayload,
  PortForward
} from '@/views/standalone/firewall/PortForward.vue'
import { watchEffect } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import NeMultiTextInput from '../NeMultiTextInput.vue'
import { ZoneType, useFirewallStore } from '@/stores/standalone/firewall'
import { computed } from 'vue'
import {
  MessageBag,
  validateIpAddress,
  validateRequired,
  validateRequiredOption,
  type validationOutput,
  validateIpOrCidr,
  validatePortRange,
  validateAnyOf,
  validatePort
} from '@/lib/validation'
import { useObjects, type ObjectReference } from '@/composables/useObjects'

const props = defineProps<{
  isShown: boolean
  initialItem: PortForward | null
  destinationObjectSuggestions: ObjectReference[]
  restrictObjectSuggestions: ObjectReference[]
}>()

const { t } = useI18n()
const firewallConfig = useFirewallStore()
const { getObjectIcon } = useObjects()

const { isShown } = toRefs(props)

const emit = defineEmits(['close', 'add-edit-port-forward'])

const showAdvancedSettings = ref(false)

const loading = ref({
  listProtocolsAndZones: false,
  listObjectSuggestions: false
})

const isSubmittingRequest = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: '',
  listObjectSuggestions: '',
  listObjectSuggestionsDetails: ''
})
const validationErrorBag = ref(new MessageBag())
const restrictIPValidationErrors = ref<string[]>([])
// contains the first invalid field ref
const firstErrorRef = ref()

// Options
const supportedProtocols = ref<NeComboboxOption[]>([])
const supportedReflectionZones = ref<NeComboboxOption[]>([])
const wanInterfaces = ref<NeComboboxOption[]>([])
const supportedDestinationZones = computed<NeComboboxOption[]>(() => {
  if (firewallConfig.loading) {
    return []
  } else {
    return [
      { id: 'any', label: t('standalone.port_forward.automatic') },
      ...firewallConfig.zones
        .filter((zone) => zone.type() != ZoneType.WAN)
        .map((zone) => ({
          id: zone.name,
          label: zone.name.toUpperCase()
        }))
    ]
  }
})

// Form fields
const id = ref('')
const name = ref('')
const nameRef = ref()
const sourcePort = ref('')
const sourcePortRef = ref()
const destinationIP = ref('')
const destinationIpRef = ref()
const destinationPort = ref('')
const destinationPortRef = ref()
const wan = ref('')
const wanRef = ref()
const enabled = ref(true)
const restrict = ref<string[]>([''])
const restrictRef = ref()
const protocols = ref<NeComboboxOption[]>([
  { id: 'tcp', label: 'TCP' },
  { id: 'udp', label: 'UDP' }
])
const protocolsRef = ref()
const log = ref(false)
const reflection = ref(false)
const reflectionZones = ref<NeComboboxOption[]>([])
const reflectionZonesRef = ref()
const destinationZone = ref('')
const destinationZoneRef = ref()
const destinationAddressType = ref<'address' | 'object'>('address')
const destinationAddressObject = ref('')
const destinationObjectRef = ref()
const restrictType = ref<'address' | 'object'>('address')
const restrictObject = ref('')
const restrictObjectRef = ref()

const destinationAddressOptions = ref([
  {
    id: 'address',
    label: t('standalone.port_forward.enter_destination_address')
  },
  {
    id: 'object',
    label: t('standalone.port_forward.select_an_object')
  }
])

const restrictOptions = ref([
  {
    id: 'address',
    label: t('standalone.port_forward.enter_restricted_addresses')
  },
  {
    id: 'object',
    label: t('standalone.port_forward.select_an_object')
  }
])

const destinationObjectsComboboxOptions = computed(() => {
  return props.destinationObjectSuggestions.map((obj) => {
    return {
      id: obj.id,
      label: obj.name,
      description: t(`standalone.objects.subtype_${obj.subtype}`),
      icon: getObjectIcon(obj.subtype)
    }
  })
})

const restrictObjectsComboboxOptions = computed(() => {
  const noObjectOption = {
    id: '',
    label: t('standalone.port_forward.no_object')
  }

  // filter out objects that contain other objects in their ipaddr
  const restrictOptions = props.restrictObjectSuggestions
    .filter((obj) => !obj.ipaddr?.some((ip: string) => ip.includes('objects/')))
    .map((obj) => {
      return {
        id: obj.id,
        label: obj.name,
        description: t(`standalone.objects.subtype_${obj.subtype}`),
        icon: getObjectIcon(obj.subtype)
      }
    })

  return [noObjectOption, ...restrictOptions]
})

const anyProtocolSelected = computed(() => protocols.value.length == 0)

function resetForm() {
  validationErrorBag.value.clear()

  id.value = props.initialItem?.id ?? ''
  name.value = props.initialItem?.name ?? ''
  sourcePort.value = props.initialItem?.source_port ?? ''

  // destination address / object
  if (props.initialItem) {
    // editing port forward
    if (props.initialItem.ns_dst) {
      // destination address is an object
      destinationAddressType.value = 'object'
      destinationIP.value = ''
      destinationAddressObject.value = props.initialItem.ns_dst
    } else {
      // destination address is an IP address
      destinationAddressType.value = 'address'
      destinationIP.value = props.initialItem.dest_ip
      destinationAddressObject.value = ''
    }
  } else {
    // creating new port forward
    destinationAddressType.value = 'address'
    destinationIP.value = ''
    destinationAddressObject.value = ''
  }
  destinationPort.value = props.initialItem?.destination_port ?? ''
  wan.value = props.initialItem?.wan ?? 'any'
  enabled.value = props.initialItem?.enabled ?? true

  // restrict addresses / object
  if (props.initialItem) {
    // editing port forward
    if (props.initialItem.ns_src) {
      // restrict address is an object
      restrictType.value = 'object'
      restrict.value = ['']
      restrictObject.value = props.initialItem.ns_src
    } else {
      // restrict address is an IP address
      restrictType.value = 'address'
      restrict.value =
        props.initialItem.restrict instanceof Array && props.initialItem.restrict.length > 0
          ? props.initialItem.restrict.map((x) => x)
          : ['']
      restrictObject.value = ''
    }
  } else {
    // creating new port forward
    restrictType.value = 'address'
    restrict.value = ['']
    restrictObject.value = ''
  }

  if (props.initialItem && props.initialItem?.protocol.some((proto) => proto === 'all')) {
    protocols.value = []
  } else {
    protocols.value = (props.initialItem?.protocol ?? ['tcp', 'udp']).map((proto: string) => ({
      id: proto,
      label: proto.toUpperCase()
    }))
  }

  log.value = props.initialItem?.log ?? false
  reflection.value = props.initialItem?.reflection ?? false
  reflectionZones.value =
    props.initialItem?.reflection_zone.map((reflectionZone) => ({
      id: reflectionZone,
      label: reflectionZone.toUpperCase()
    })) ?? []
  destinationZone.value = props.initialItem?.dest ?? 'any'
}

async function fetchOptions() {
  loading.value.listProtocolsAndZones = true

  try {
    supportedProtocols.value = (
      await ubusCall('ns.redirects', 'list-protocols')
    ).data.protocols.map((proto: string) => ({
      id: proto,
      label: proto.toUpperCase()
    }))
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_protocols')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    return
  }

  try {
    supportedReflectionZones.value = (await ubusCall('ns.redirects', 'list-zones')).data.zones.map(
      (zone: string) => ({
        id: zone,
        label: zone.toUpperCase()
      })
    )
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_zones')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    return
  }

  try {
    wanInterfaces.value = [
      { id: 'any', label: t('common.any') },
      ...(await ubusCall('ns.redirects', 'list-wans')).data.wans.map(
        (iface: { device: string; ipaddr: string }) => ({
          id: iface.ipaddr,
          label: iface.ipaddr,
          description: iface.device
        })
      )
    ]
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_wan_interfaces')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    return
  }
  loading.value.listProtocolsAndZones = false
  focusElement(nameRef)
}

watchEffect(() => {
  resetForm()
})

function close() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  validationErrorBag.value.clear()
  restrictIPValidationErrors.value = []
  showAdvancedSettings.value = false

  resetForm()
  emit('close')
}

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      fetchOptions()
      if (firewallConfig.loading || firewallConfig.error) {
        firewallConfig.fetch()
      }
    }
  }
)

function resetRestrictIPValidationErrors() {
  restrictIPValidationErrors.value = []
}

function runFieldValidators(
  validators: validationOutput[],
  fieldName: string,
  fieldRef: Ref
): boolean {
  for (let validator of validators) {
    if (!validator.valid) {
      validationErrorBag.value.set(fieldName, [t(validator.errMessage as string)])

      // remember the first field with error for focus management
      if (!firstErrorRef.value) {
        firstErrorRef.value = fieldRef
      }
    }
  }
  return validators.every((validator) => validator.valid)
}

function validate(): boolean {
  validationErrorBag.value.clear()

  restrictIPValidationErrors.value = []
  restrict.value.forEach(() => {
    restrictIPValidationErrors.value.push('')
  })

  // reset firstErrorRef for focus management
  firstErrorRef.value = undefined

  let validRestrict = true

  if (restrictType.value === 'address') {
    // restrict is a list of IP addresses
    for (let [index, restrictValue] of restrict.value.entries()) {
      if (restrictValue) {
        let validator = validateIpOrCidr(restrictValue)
        if (!validator.valid) {
          restrictIPValidationErrors.value[index] = t(validator.errMessage as string)
          validRestrict = false
          firstErrorRef.value = restrictRef
          break
        }
      }
    }
  }

  if (!validRestrict) {
    showAdvancedSettings.value = true
  }

  const sourceDestinationPortValidators: [validationOutput[], string, Ref][] = [
    [
      [
        // if destination port is present, source port is required
        destinationPort.value ? validateRequired(sourcePort.value) : { valid: true },
        sourcePort.value
          ? validateAnyOf(
              [validatePort, validatePortRange],
              sourcePort.value,
              t('error.invalid_port_or_port_range')
            )
          : { valid: true }
      ],
      'sourcePort',
      sourcePortRef
    ],
    [
      [
        destinationPort.value
          ? validateAnyOf(
              [validatePort, validatePortRange],
              destinationPort.value,
              t('error.invalid_port_or_port_range')
            )
          : { valid: true }
      ],
      'destinationPort',
      destinationPortRef
    ]
  ]

  let validators: [validationOutput[], string, Ref][] = [
    [[validateRequired(name.value)], 'name', nameRef],
    ...(anyProtocolSelected.value ? [] : sourceDestinationPortValidators),
    destinationAddressType.value === 'address'
      ? [
          [validateRequired(destinationIP.value), validateIpAddress(destinationIP.value)],
          'destinationIP',
          destinationIpRef
        ]
      : [
          [validateRequired(destinationAddressObject.value)],
          'destinationAddressObject',
          destinationObjectRef
        ],
    [
      reflection.value ? [validateRequiredOption(reflectionZones.value)] : [],
      'reflectionZones',
      reflectionZonesRef
    ]
  ]

  const isValidationOk = validators
    .map(([validators, fieldName, fieldRef]) => runFieldValidators(validators, fieldName, fieldRef))
    .every((result) => result)

  if (firstErrorRef.value) {
    focusElement(firstErrorRef.value)
  }
  return validRestrict && isValidationOk
}

async function createOrEditPortForward() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  const isEditing = id.value != ''

  try {
    isSubmittingRequest.value = true
    const requestType = isEditing ? 'edit-redirect' : 'add-redirect'

    if (validate()) {
      const payload: CreateEditPortForwardPayload = {
        dest_ip: '',
        ns_dst: '',
        proto: anyProtocolSelected.value
          ? ['all']
          : protocols.value.map((protoObj: NeComboboxOption) => protoObj.id),
        src_dport: anyProtocolSelected.value ? '' : sourcePort.value,
        dest_port: anyProtocolSelected.value ? '' : destinationPort.value,
        name: name.value,
        src_dip: wan.value === 'any' ? '' : wan.value,
        enabled: enabled.value ? '1' : '0',
        log: log.value ? '1' : '0',
        reflection: reflection.value ? '1' : '0',
        restrict: [''],
        ns_src: '',
        dest: destinationZone.value === 'any' ? '' : destinationZone.value,
        reflection_zone: reflectionZones.value.map(
          (reflectionZone: NeComboboxOption) => reflectionZone.id
        )
      }

      if (isEditing) {
        payload.id = id.value
      }

      if (destinationAddressType.value === 'address') {
        // destination address
        payload.dest_ip = destinationIP.value
      } else {
        // destination object
        payload.ns_dst = destinationAddressObject.value
      }

      if (restrictType.value === 'address') {
        // restrict addresses
        payload.restrict = restrict.value.filter((x) => x != '')
      } else {
        // restrict object
        payload.ns_src = restrictObject.value
      }

      await ubusCall('ns.redirects', requestType, payload)
      emit('add-edit-port-forward')
      close()
    }
  } catch (err: any) {
    error.value.notificationTitle = isEditing
      ? t('error.cannot_edit_port_forward')
      : t('error.cannot_create_port_forward')

    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    isSubmittingRequest.value = false
  }
}
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="close()"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    :title="
      id
        ? t('standalone.port_forward.edit_port_forward')
        : t('standalone.port_forward.add_port_forward')
    "
  >
    <NeInlineNotification
      v-if="error.notificationTitle || firewallConfig.error"
      :title="firewallConfig.error ? t('error.cannot_retrieve_zones') : error.notificationTitle"
      :description="
        firewallConfig.error
          ? t(getAxiosErrorMessage(firewallConfig.error))
          : error.notificationDescription
      "
      class="mb-6"
      kind="error"
    >
      <template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template>
    </NeInlineNotification>
    <NeSkeleton
      v-if="
        loading.listProtocolsAndZones || loading.listObjectSuggestions || firewallConfig.loading
      "
      size="lg"
      :lines="10"
    />
    <div v-else-if="!firewallConfig.error" class="flex flex-col gap-y-6">
      <div>
        <NeFormItemLabel>{{ t('standalone.port_forward.status') }}</NeFormItemLabel>
        <NeToggle
          :label="
            enabled ? t('standalone.port_forward.enabled') : t('standalone.port_forward.disabled')
          "
          v-model="enabled"
        />
      </div>
      <NeTextInput
        :label="t('standalone.port_forward.name')"
        v-model="name"
        :disabled="isSubmittingRequest"
        :invalid-message="validationErrorBag.getFirstFor('name')"
        ref="nameRef"
      />
      <NeCombobox
        :label="t('standalone.port_forward.protocols')"
        :helper-text="t('standalone.port_forward.protocol_helper')"
        :multiple="true"
        :options="supportedProtocols"
        v-model="protocols"
        :placeholder="t('standalone.port_forward.choose_protocol')"
        :invalid-message="validationErrorBag.getFirstFor('protocols')"
        :disabled="isSubmittingRequest"
        :noResultsLabel="t('ne_combobox.no_results')"
        :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
        :noOptionsLabel="t('ne_combobox.no_options_label')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
        :optionalLabel="t('common.optional')"
        ref="protocolsRef"
      />
      <NeInlineNotification
        kind="info"
        :title="t('standalone.port_forward.any_protocol')"
        :description="t('standalone.port_forward.any_protocol_message')"
        v-if="anyProtocolSelected"
      />
      <NeTextInput
        v-if="!anyProtocolSelected"
        :label="t('standalone.port_forward.source_port')"
        v-model="sourcePort"
        :invalid-message="validationErrorBag.getFirstFor('sourcePort')"
        :optional="true"
        :disabled="isSubmittingRequest"
        :optionalLabel="t('common.optional')"
        :helper-text="t('standalone.port_forward.source_destination_port_helper')"
        ref="sourcePortRef"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.port_forward.source_port_tooltip') }}
            </template>
          </NeTooltip>
        </template>
      </NeTextInput>
      <!-- listObjectSuggestions error notification -->
      <NeInlineNotification
        v-if="error.listObjectSuggestions"
        kind="error"
        :title="t('error.cannot_retrieve_object_suggestions')"
        :description="error.listObjectSuggestions"
      >
        <template #details v-if="error.listObjectSuggestionsDetails">
          {{ error.listObjectSuggestionsDetails }}
        </template>
      </NeInlineNotification>
      <!-- destination address type -->
      <NeRadioSelection
        v-model="destinationAddressType"
        :label="t('standalone.port_forward.destination_address_type')"
        :options="destinationAddressOptions"
        :disabled="isSubmittingRequest"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.port_forward.destination_address_tooltip') }}
            </template>
          </NeTooltip>
        </template>
      </NeRadioSelection>
      <!-- destination address -->
      <NeTextInput
        v-show="destinationAddressType === 'address'"
        :label="t('standalone.port_forward.destination_address')"
        v-model="destinationIP"
        :invalid-message="validationErrorBag.getFirstFor('destinationIP')"
        :disabled="isSubmittingRequest"
        ref="destinationIpRef"
      />
      <!-- destination object -->
      <NeCombobox
        v-show="destinationAddressType === 'object'"
        v-model="destinationAddressObject"
        :disabled="isSubmittingRequest"
        :label="t('standalone.port_forward.destination_object')"
        :options="destinationObjectsComboboxOptions"
        :invalid-message="validationErrorBag.getFirstFor('destinationAddressObject')"
        :placeholder="t('ne_combobox.choose')"
        :optionalLabel="t('common.optional')"
        :noResultsLabel="t('ne_combobox.no_results')"
        :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
        :noOptionsLabel="t('ne_combobox.no_options_label')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
        ref="destinationObjectRef"
      >
        <template #tooltip>
          <NeTooltip
            ><template #content>{{
              t('standalone.port_forward.restricted_object_tooltip')
            }}</template></NeTooltip
          >
        </template>
      </NeCombobox>
      <NeTextInput
        v-if="!anyProtocolSelected"
        :label="t('standalone.port_forward.destination_port')"
        v-model="destinationPort"
        :invalid-message="validationErrorBag.getFirstFor('destinationPort')"
        :optional="true"
        :optionalLabel="t('common.optional')"
        :helper-text="t('standalone.port_forward.source_destination_port_helper')"
        :disabled="isSubmittingRequest"
        ref="destinationPortRef"
      >
        <template #tooltip
          ><NeTooltip
            ><template #content>{{
              t('standalone.port_forward.destination_port_tooltip')
            }}</template></NeTooltip
          ></template
        >
      </NeTextInput>
      <!-- advanced settings -->
      <NeExpandable
        :label="t('common.advanced_settings')"
        :isExpanded="showAdvancedSettings"
        @setExpanded="(ev: boolean) => (showAdvancedSettings = ev)"
      >
        <div class="space-y-6">
          <NeCombobox
            :label="t('standalone.port_forward.destination_zone')"
            :placeholder="t('standalone.port_forward.choose_zone')"
            :options="supportedDestinationZones"
            v-model="destinationZone"
            :disabled="isSubmittingRequest"
            :noResultsLabel="t('ne_combobox.no_results')"
            :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
            :noOptionsLabel="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            :optionalLabel="t('common.optional')"
            ref="destinationZoneRef"
          />
          <NeCombobox
            :label="t('standalone.port_forward.wan_ip')"
            :options="wanInterfaces"
            v-model="wan"
            :disabled="isSubmittingRequest"
            :noResultsLabel="t('ne_combobox.no_results')"
            :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
            :noOptionsLabel="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            :optionalLabel="t('common.optional')"
            ref="wanRef"
          />
          <!-- restrict type -->
          <NeRadioSelection
            v-model="restrictType"
            :label="t('standalone.port_forward.restrict_access_from')"
            :options="restrictOptions"
            :disabled="isSubmittingRequest"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.port_forward.restrict_access_from_tooltip') }}
                </template>
              </NeTooltip>
            </template>
          </NeRadioSelection>
          <!-- restrict addresses -->
          <NeMultiTextInput
            v-show="restrictType === 'address'"
            :title="t('standalone.port_forward.restricted_addresses')"
            :optional="true"
            :optional-label="t('common.optional')"
            :add-item-label="t('standalone.port_forward.add_ip_address')"
            :invalid-messages="restrictIPValidationErrors"
            v-model="restrict"
            :disabled="isSubmittingRequest"
            @delete-item="resetRestrictIPValidationErrors"
            ref="restrictRef"
          />
          <!-- restrict object -->
          <NeCombobox
            v-show="restrictType === 'object'"
            v-model="restrictObject"
            :optional="true"
            :disabled="isSubmittingRequest"
            :label="t('standalone.port_forward.restricted_object')"
            :options="restrictObjectsComboboxOptions"
            :invalid-message="validationErrorBag.getFirstFor('restrictObject')"
            :placeholder="t('ne_combobox.choose')"
            :optionalLabel="t('common.optional')"
            :noResultsLabel="t('ne_combobox.no_results')"
            :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
            :noOptionsLabel="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            ref="restrictObjectRef"
          >
            <template #tooltip>
              <NeTooltip
                ><template #content>{{
                  t('standalone.port_forward.restricted_object_tooltip')
                }}</template></NeTooltip
              >
            </template>
          </NeCombobox>
          <NeToggle
            :topLabel="t('standalone.port_forward.log')"
            :label="
              log ? t('standalone.port_forward.enabled') : t('standalone.port_forward.disabled')
            "
            v-model="log"
            :disabled="isSubmittingRequest"
          />
          <NeToggle
            :topLabel="t('standalone.port_forward.hairpin_nat')"
            :label="
              reflection
                ? t('standalone.port_forward.enabled')
                : t('standalone.port_forward.disabled')
            "
            v-model="reflection"
            :disabled="isSubmittingRequest"
          />
          <NeCombobox
            v-if="reflection"
            :label="t('standalone.port_forward.hairpin_nat_zones')"
            :placeholder="t('standalone.port_forward.choose_zone')"
            :options="supportedReflectionZones"
            v-model="reflectionZones"
            :invalid-message="validationErrorBag.getFirstFor('reflectionZones')"
            :multiple="true"
            :noResultsLabel="t('ne_combobox.no_results')"
            :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
            :noOptionsLabel="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            :optionalLabel="t('common.optional')"
            ref="reflectionZonesRef"
          />
        </div>
      </NeExpandable>
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="createOrEditPortForward()"
          :disabled="isSubmittingRequest"
          :loading="isSubmittingRequest"
          >{{
            id
              ? t('standalone.port_forward.save_port_forward')
              : t('standalone.port_forward.add_port_forward')
          }}</NeButton
        >
      </div>
    </div>
  </NeSideDrawer>
</template>
