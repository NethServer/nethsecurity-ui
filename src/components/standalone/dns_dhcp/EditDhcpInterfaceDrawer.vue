<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, toRefs, watch, watchEffect } from 'vue'
import {
  MessageBag,
  validateIpAddress,
  validateLeaseTime,
  validateRequired,
  type validationOutput
} from '@/lib/validation'
import {
  getAxiosErrorMessage,
  NeButton,
  type NeComboboxOption,
  NeInlineNotification,
  NeRadioSelection,
  NeSideDrawer,
  NeSkeleton,
  NeTextInput,
  NeToggle,
  NeTooltip
} from '@nethesis/vue-components'
import NeMultiTextInput, { type KeyValueItem } from '../NeMultiTextInput.vue'
import { useI18n } from 'vue-i18n'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'

const props = defineProps<{
  isShown: boolean
  interfaceToEdit: string
}>()
const { isShown } = toRefs(props)

const { t } = useI18n()

const emit = defineEmits(['close', 'edit-interface'])

const isSavingChanges = ref(false)
const loading = ref(true)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const validationErrorBag = ref(new MessageBag())
const dhcpOptionValueErrors = ref<string[]>([])
const dhcpOptionKeyErrors = ref<string[]>([])

const showAdvancedSettings = ref(false)
const availableDhcpOptions = ref<NeComboboxOption[]>([])

// Form fields
const iface = ref('')
const enableDhcp = ref(false)
const rangeIpStart = ref('')
const rangeIpEnd = ref('')
const leaseTime = ref('')
const dhcpOptions = ref<KeyValueItem[]>([])
const force = ref(true)
const enableMacIpBinding = ref(false)
const macIpBindingType = ref<'soft' | 'strict'>('soft')

// TODO: export RadioOption from library
type RadioOption = {
  id: typeof macIpBindingType.value
  label: string
  description: string
}

const macIpBindingSelections: RadioOption[] = [
  {
    id: 'soft',
    label: t('standalone.dns_dhcp.soft_binding'),
    description: t('standalone.dns_dhcp.soft_binding_description')
  },
  {
    id: 'strict',
    label: t('standalone.dns_dhcp.strict_binding'),
    description: t('standalone.dns_dhcp.strict_binding_description')
  }
]

async function resetForm() {
  if (props.interfaceToEdit) {
    try {
      loading.value = true
      const interfaceResponse = (
        await ubusCall('ns.dhcp', 'get-interface', { interface: props.interfaceToEdit })
      ).data
      iface.value = interfaceResponse.interface
      rangeIpStart.value = interfaceResponse.first
      rangeIpEnd.value = interfaceResponse.last
      leaseTime.value = interfaceResponse.leasetime
      enableDhcp.value = interfaceResponse.active
      dhcpOptions.value = interfaceResponse.options.map((optionObj: { [key: string]: string }) => {
        const key = Object.keys(optionObj)[0]
        return { key, value: optionObj[key] }
      })
      force.value = interfaceResponse.force
      if ('ns_binding' in interfaceResponse) {
        if (interfaceResponse.ns_binding != 0) {
          enableMacIpBinding.value = true
        }
        if (interfaceResponse.ns_binding == 1) {
          macIpBindingType.value = 'soft'
        } else if (interfaceResponse.ns_binding == 2) {
          macIpBindingType.value = 'strict'
        }
      }
      loading.value = false
    } catch (err: any) {
      error.value.notificationTitle = t('error.cannot_retrieve_interface_details')
      error.value.notificationDescription =
        err.response.data.message == 'interface_not_found'
          ? t('standalone.dns_dhcp.interface_not_found')
          : t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    }
  } else {
    iface.value = ''
    enableDhcp.value = false
    rangeIpStart.value = ''
    rangeIpEnd.value = ''
    leaseTime.value = ''
    dhcpOptions.value = []
    force.value = true
    enableMacIpBinding.value = false
    macIpBindingType.value = 'soft'
  }
}

function runValidators(validators: validationOutput[], label: string): boolean {
  for (const validator of validators) {
    if (!validator.valid) {
      validationErrorBag.value.set(label, [validator.errMessage as string])
    }
  }

  return validators.every((validator) => validator.valid)
}

async function loadDhcpOptions() {
  try {
    loading.value = true
    const dhcpOptionsResponse = (await ubusCall('ns.dhcp', 'list-dhcp-options')).data
    availableDhcpOptions.value = Object.keys(dhcpOptionsResponse).map((dhcpOptionKey) => {
      return {
        id: dhcpOptionKey,
        label: !isNaN(Number(dhcpOptionKey))
          ? `${dhcpOptionKey}: ${t('standalone.dns_dhcp.custom')}`
          : `${dhcpOptionsResponse[dhcpOptionKey]}: ${dhcpOptionKey}`
      }
    })
    loading.value = false
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_dhcp_options')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}

function validate() {
  validationErrorBag.value.clear()

  dhcpOptionValueErrors.value = []
  dhcpOptions.value.forEach(() => {
    dhcpOptionValueErrors.value.push('')
  })

  dhcpOptionKeyErrors.value = []
  dhcpOptions.value.forEach(() => {
    dhcpOptionKeyErrors.value.push('')
  })

  let validDhcpOptionValues = true
  for (const [index, dhcpOption] of dhcpOptions.value.entries()) {
    const dhcpValueValidator = validateRequired(dhcpOption.value)
    if (!dhcpValueValidator.valid) {
      dhcpOptionValueErrors.value[index] = t(dhcpValueValidator.errMessage as string)
      validDhcpOptionValues = false
      break
    }
  }

  let validDhcpOptionKeys = true
  for (const [index, dhcpOption] of dhcpOptions.value.entries()) {
    const dhcpKeyValidator = validateRequired(dhcpOption.key)
    if (!dhcpKeyValidator.valid) {
      dhcpOptionKeyErrors.value[index] = t(dhcpKeyValidator.errMessage as string)
      validDhcpOptionKeys = false
      break
    }
  }

  const validators: [validationOutput[], string][] = [
    [[validateRequired(rangeIpStart.value), validateIpAddress(rangeIpStart.value)], 'first'],
    [[validateRequired(rangeIpEnd.value), validateIpAddress(rangeIpEnd.value)], 'last'],
    [[validateRequired(leaseTime.value), validateLeaseTime(leaseTime.value)], 'leasetime']
  ]

  return (
    validators
      .map(([validator, label]) => runValidators(validator, label))
      .every((result) => result) &&
    validDhcpOptionValues &&
    validDhcpOptionKeys
  )
}

async function saveChanges() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''

  try {
    isSavingChanges.value = true

    if (validate()) {
      let nsBinding = 0
      if (enableMacIpBinding.value) {
        nsBinding = macIpBindingType.value == 'soft' ? 1 : 2
      }
      await ubusCall('ns.dhcp', 'edit-interface', {
        interface: iface.value,
        first: rangeIpStart.value,
        last: rangeIpEnd.value,
        active: enableDhcp.value,
        leasetime: leaseTime.value,
        options: dhcpOptions.value.map((option) => ({ [option.key]: option.value })),
        force: force.value,
        ns_binding: nsBinding
      })
      emit('edit-interface')
      close()
    }
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationErrorBag.value = err.errorBag
    } else {
      error.value.notificationTitle = t('error.cannot_edit_interface')
      error.value.notificationDescription =
        err.response.data.message == 'interface_not_found'
          ? t('standalone.dns_dhcp.interface_not_found')
          : t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    }
  } finally {
    isSavingChanges.value = false
  }
}

function close() {
  validationErrorBag.value.clear()
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  dhcpOptionValueErrors.value = []
  dhcpOptionKeyErrors.value = []
  emit('close')
}

watchEffect(() => {
  resetForm()
})

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      loadDhcpOptions()
    }
  }
)
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    :close-aria-label="t('common.shell.close_side_drawer')"
    :title="t('standalone.dns_dhcp.edit_interface', { interface: iface })"
    @close="close()"
  >
    <NeInlineNotification
      v-if="error.notificationDescription"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
    >
      <template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template>
    </NeInlineNotification>
    <NeSkeleton v-if="loading" :lines="10" />
    <div v-else class="space-y-8">
      <div class="space-y-6">
        <div class="space-y-4">
          <h5 class="text-lg font-medium text-secondary">
            {{ t('standalone.dns_dhcp.mac_binding') }}
          </h5>
          <NeToggle
            v-model="enableMacIpBinding"
            :label="t('common.enabled')"
            :top-label="t('common.status')"
          >
            <template #topTooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.dns_dhcp.mac_binding_tooltip') }}
                </template>
              </NeTooltip>
            </template>
          </NeToggle>
          <NeRadioSelection
            v-if="enableMacIpBinding"
            v-model="macIpBindingType"
            :label="t('common.type')"
            :options="macIpBindingSelections"
          />
        </div>
      </div>
      <div class="space-y-6">
        <div class="space-y-4">
          <h5 class="text-lg font-medium text-secondary">
            {{ t('standalone.dns_dhcp.dhcp') }}
          </h5>
          <NeToggle
            v-model="enableDhcp"
            :label="t('common.enabled')"
            :top-label="t('common.status')"
          />
        </div>
        <NeTextInput
          v-model="rangeIpStart"
          :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('first'))"
          :label="t('standalone.dns_dhcp.range_ip_start')"
        />
        <NeTextInput
          v-model="rangeIpEnd"
          :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('last'))"
          :label="t('standalone.dns_dhcp.range_ip_end')"
        />
        <NeTextInput
          v-model="leaseTime"
          :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('leasetime'))"
          :label="t('standalone.dns_dhcp.lease_time')"
        >
          <template #tooltip>
            <NeTooltip>
              <template #content>
                {{ t('standalone.dns_dhcp.lease_time_tooltip') }}
              </template>
            </NeTooltip>
          </template>
        </NeTextInput>
        <div>
          <NeButton kind="tertiary" @click="showAdvancedSettings = !showAdvancedSettings">
            {{ t('standalone.dns_dhcp.advanced_settings') }}
            <template #suffix>
              <FontAwesomeIcon
                :icon="showAdvancedSettings ? faChevronUp : faChevronDown"
                aria-hidden="true"
                class="h-4 w-4"
              />
            </template>
          </NeButton>
        </div>
        <template v-if="showAdvancedSettings">
          <NeToggle v-model="force" :label="t('standalone.dns_dhcp.force_start')">
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.dns_dhcp.force_start_tooltip') }}
                </template>
              </NeTooltip>
            </template>
          </NeToggle>
          <NeMultiTextInput
            v-model="dhcpOptions"
            :add-item-label="t('standalone.dns_dhcp.add_dhcp_option')"
            :invalid-key-messages="dhcpOptionKeyErrors"
            :invalid-messages="dhcpOptionValueErrors"
            :key-input-placeholder="t('standalone.dns_dhcp.dhcp_option_combobox_placeholder')"
            :key-options="availableDhcpOptions"
            :optional="true"
            :optional-label="t('common.optional')"
            :title="t('standalone.dns_dhcp.dhcp_option')"
            :use-key-input="true"
            key-input-type="combobox"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.dns_dhcp.dhcp_option_tooltip') }}
                </template>
              </NeTooltip>
            </template>
          </NeMultiTextInput>
        </template>
        <hr />
        <div class="flex justify-end">
          <NeButton class="mr-4" kind="tertiary" @click="close()"
            >{{ t('common.cancel') }}
          </NeButton>
          <NeButton
            :disabled="isSavingChanges"
            :loading="isSavingChanges"
            kind="primary"
            @click="saveChanges()"
            >{{ t('common.save') }}
          </NeButton>
        </div>
      </div>
    </div>
  </NeSideDrawer>
</template>
