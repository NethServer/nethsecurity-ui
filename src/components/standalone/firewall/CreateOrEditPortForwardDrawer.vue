<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeCombobox, type NeComboboxOption } from '@nethesis/vue-components'
import {
  NeSideDrawer,
  NeToggle,
  NeTextInput,
  NeButton,
  NeSkeleton,
  NeInlineNotification,
  NeTooltip,
  NeFormItemLabel,
  getAxiosErrorMessage
} from '@nethserver/vue-tailwind-lib'
import { toRefs, ref, watch } from 'vue'
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
  validatePort,
  validateRequiredOption,
  type validationOutput
} from '@/lib/validation'

const props = defineProps<{
  isShown: boolean
  initialItem: PortForward | null
}>()
const { isShown } = toRefs(props)

const emit = defineEmits(['close', 'add-edit-port-forward'])

const firewallConfig = useFirewallStore()

const showAdvancedSettings = ref(false)
const loading = ref(true)
const isSubmittingRequest = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const validationErrorBag = ref(new MessageBag())
const restrictIPValidationErrors = ref<string[]>([])

// Options
const supportedProtocols = ref<NeComboboxOption[]>([])
const supportedReflectionZones = ref<NeComboboxOption[]>([])
const wanInterfaces = ref<NeComboboxOption[]>([])
const supportedDestinationZones = computed<NeComboboxOption[]>(() => {
  if (firewallConfig.loading) {
    return []
  } else {
    return [
      { id: 'any', label: t('standalone.port_forward.any_zone') },
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
const sourcePort = ref('')
const destinationIP = ref('')
const destinationPort = ref('')
const wan = ref('')
const enabled = ref(true)
const restrict = ref<string[]>([''])
const protocols = ref<NeComboboxOption[]>([])
const log = ref(false)
const reflection = ref(false)
const reflectionZones = ref<NeComboboxOption[]>([])
const destinationZone = ref('')

function resetForm() {
  validationErrorBag.value.clear()

  id.value = props.initialItem?.id ?? ''
  name.value = props.initialItem?.name ?? ''
  sourcePort.value = props.initialItem?.source_port ?? ''
  destinationIP.value = props.initialItem?.dest_ip ?? ''
  destinationPort.value = props.initialItem?.destination_port ?? ''
  wan.value = props.initialItem?.wan ?? 'any'
  enabled.value = props.initialItem?.enabled ?? true
  restrict.value =
    props.initialItem?.restrict && props.initialItem.restrict.length > 0
      ? props.initialItem?.restrict.map((x) => x)
      : ['']
  protocols.value =
    props.initialItem?.protocol.map((proto: string) => ({
      id: proto,
      label: proto.toUpperCase()
    })) ?? []
  log.value = props.initialItem?.log ?? false
  reflection.value = props.initialItem?.reflection ?? false
  reflectionZones.value =
    props.initialItem?.reflection_zone.map((reflectionZone) => ({
      id: reflectionZone,
      label: reflectionZone.toUpperCase()
    })) ?? []
  destinationZone.value = props.initialItem?.dest ?? 'any'
}

const { t } = useI18n()

async function fetchOptions() {
  loading.value = true
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
      { id: 'any', label: t('standalone.port_forward.any') },
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
  loading.value = false
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

function runValidators(validators: validationOutput[], label: string): boolean {
  for (let validator of validators) {
    if (!validator.valid) {
      validationErrorBag.value.set(label, [t(validator.errMessage as string)])
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

  let validRestrict = true
  for (let [index, restrictValue] of restrict.value.entries()) {
    if (restrictValue) {
      let validator = validateIpAddress(restrictValue)
      if (!validator.valid) {
        restrictIPValidationErrors.value[index] = t(validator.errMessage as string)
        validRestrict = false
        break
      }
    }
  }

  if (!validRestrict) {
    showAdvancedSettings.value = true
  }

  let validators: [validationOutput[], string][] = [
    [[validateRequired(name.value)], 'name'],
    [[validateRequired(sourcePort.value), validatePort(sourcePort.value)], 'sourcePort'],
    [[validateRequiredOption(protocols.value)], 'protocols'],
    [
      [validateRequired(destinationIP.value), validateIpAddress(destinationIP.value)],
      'destinationIP'
    ],
    [
      [validateRequired(destinationPort.value), validatePort(destinationPort.value)],
      'destinationPort'
    ],
    [reflection.value ? [validateRequiredOption(reflectionZones.value)] : [], 'reflectionZones']
  ]

  return (
    validators
      .map(([validator, label]) => runValidators(validator, label))
      .every((result) => result) && validRestrict
  )
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
        dest_ip: destinationIP.value,
        proto: protocols.value.map((protoObj) => protoObj.id),
        src_dport: sourcePort.value,
        dest_port: destinationPort.value,
        name: name.value,
        src_dip: wan.value === 'any' ? '' : wan.value,
        enabled: enabled.value ? '1' : '0',
        log: log.value ? '1' : '0',
        reflection: reflection.value ? '1' : '0',
        restrict: restrict.value.filter((x) => x != ''),
        dest: destinationZone.value === 'any' ? '' : destinationZone.value,
        reflection_zone: reflectionZones.value.map((reflectionZone) => reflectionZone.id)
      }

      if (isEditing) {
        payload.id = id.value
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
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
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
    <NeSkeleton v-if="loading || firewallConfig.loading" :lines="10" />
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
        :invalid-message="validationErrorBag.getFirstFor('name')"
      />
      <NeCombobox
        :label="t('standalone.port_forward.protocols')"
        :placeholder="t('standalone.port_forward.choose_protocol')"
        :multiple="true"
        :options="supportedProtocols"
        v-model="protocols"
        :invalid-message="validationErrorBag.getFirstFor('protocols')"
        :noResultsLabel="t('ne_combobox.no_results')"
        :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
        :noOptionsLabel="t('ne_combobox.no_options_label')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
        :optionalLabel="t('common.optional')"
      />
      <NeTextInput
        :label="t('standalone.port_forward.source_port')"
        v-model="sourcePort"
        :invalid-message="validationErrorBag.getFirstFor('sourcePort')"
        type="number"
      />
      <NeTextInput
        :label="t('standalone.port_forward.destination_address')"
        v-model="destinationIP"
        :invalid-message="validationErrorBag.getFirstFor('destinationIP')"
      >
        <template #tooltip
          ><NeTooltip
            ><template #content>{{
              t('standalone.port_forward.destination_address_tooltip')
            }}</template></NeTooltip
          ></template
        >
      </NeTextInput>
      <NeTextInput
        :label="t('standalone.port_forward.destination_port')"
        v-model="destinationPort"
        :invalid-message="validationErrorBag.getFirstFor('destinationPort')"
        type="number"
      />
      <div>
        <NeButton kind="tertiary" @click="showAdvancedSettings = !showAdvancedSettings">
          {{ t('standalone.port_forward.advanced_settings') }}
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
        <NeCombobox
          :label="t('standalone.port_forward.destination_zone')"
          :placeholder="t('standalone.port_forward.choose_zone')"
          :options="supportedDestinationZones"
          v-model="destinationZone"
          :noResultsLabel="t('ne_combobox.no_results')"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optionalLabel="t('common.optional')"
        />
        <NeCombobox
          :label="t('standalone.port_forward.wan_ip')"
          :options="wanInterfaces"
          v-model="wan"
          :noResultsLabel="t('ne_combobox.no_results')"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optionalLabel="t('common.optional')"
        />
        <NeMultiTextInput
          :title="t('standalone.port_forward.restrict_access_to')"
          :optional="true"
          :optional-label="t('common.optional')"
          :add-item-label="t('standalone.port_forward.add_ip_address')"
          :invalid-messages="restrictIPValidationErrors"
          v-model="restrict"
          @delete-item="resetRestrictIPValidationErrors"
        >
          <template #tooltip>
            <NeTooltip
              ><template #content>{{
                t('standalone.port_forward.restrict_access_to_tooltip')
              }}</template></NeTooltip
            >
          </template>
        </NeMultiTextInput>
        <div>
          <NeFormItemLabel>{{ t('standalone.port_forward.log') }}</NeFormItemLabel>
          <NeToggle
            :label="
              log ? t('standalone.port_forward.enabled') : t('standalone.port_forward.disabled')
            "
            v-model="log"
          />
        </div>
        <div>
          <NeFormItemLabel>{{ t('standalone.port_forward.hairpin_nat') }}</NeFormItemLabel>
          <NeToggle
            :label="
              reflection
                ? t('standalone.port_forward.enabled')
                : t('standalone.port_forward.disabled')
            "
            v-model="reflection"
          />
        </div>
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
        />
      </template>
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="createOrEditPortForward()"
          :disabled="isSubmittingRequest"
          :loading="isSubmittingRequest"
          >{{ id ? t('common.save') : t('standalone.port_forward.add_port_forward') }}</NeButton
        >
      </div>
    </div>
  </NeSideDrawer>
</template>
