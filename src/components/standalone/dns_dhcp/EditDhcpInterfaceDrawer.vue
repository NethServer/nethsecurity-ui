<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, toRefs, watch } from 'vue'
import {
  MessageBag,
  validateIpAddress,
  validateLeaseTime,
  validateRequired,
  type validationOutput
} from '@/lib/validation'
import { watchEffect } from 'vue'
import {
  type NeComboboxOption,
  NeInlineNotification,
  NeSideDrawer,
  NeButton,
  NeSkeleton,
  NeTooltip,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeToggle } from '@nethesis/vue-components'
import NeMultiTextInput, { type KeyValueItem } from '../NeMultiTextInput.vue'
import { useI18n } from 'vue-i18n'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'

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
  }
}

function runValidators(validators: validationOutput[], label: string): boolean {
  for (let validator of validators) {
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
        label: `${dhcpOptionsResponse[dhcpOptionKey]}: ${dhcpOptionKey}`
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
  for (let [index, dhcpOption] of dhcpOptions.value.entries()) {
    let dhcpValueValidator = validateRequired(dhcpOption.value)
    if (!dhcpValueValidator.valid) {
      dhcpOptionValueErrors.value[index] = t(dhcpValueValidator.errMessage as string)
      validDhcpOptionValues = false
      break
    }
  }

  let validDhcpOptionKeys = true
  for (let [index, dhcpOption] of dhcpOptions.value.entries()) {
    let dhcpKeyValidator = validateRequired(dhcpOption.key)
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
      await ubusCall('ns.dhcp', 'edit-interface', {
        interface: iface.value,
        first: rangeIpStart.value,
        last: rangeIpEnd.value,
        active: enableDhcp.value,
        leasetime: leaseTime.value,
        options: dhcpOptions.value.map((option) => ({ [option.key]: option.value })),
        force: force.value
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
    @close="close()"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    :title="t('standalone.dns_dhcp.edit_interface', { interface: iface })"
  >
    <NeInlineNotification
      v-if="error.notificationDescription"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
    >
      <template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <NeSkeleton :lines="10" v-if="loading" />
    <div v-else class="flex flex-col gap-y-6">
      <NeToggle v-model="enableDhcp" :label="t('standalone.dns_dhcp.enable_dhcp')" />
      <NeTextInput
        v-model="rangeIpStart"
        :label="t('standalone.dns_dhcp.range_ip_start')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('first'))"
      />
      <NeTextInput
        v-model="rangeIpEnd"
        :label="t('standalone.dns_dhcp.range_ip_end')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('last'))"
      />
      <NeTextInput
        v-model="leaseTime"
        :label="t('standalone.dns_dhcp.lease_time')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('leasetime'))"
        ><template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.dns_dhcp.lease_time_tooltip') }}
            </template>
          </NeTooltip>
        </template></NeTextInput
      >
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
          :title="t('standalone.dns_dhcp.dhcp_option')"
          :use-key-input="true"
          key-input-type="combobox"
          :add-item-label="t('standalone.dns_dhcp.add_dhcp_option')"
          :optional="true"
          :optional-label="t('common.optional')"
          :key-options="availableDhcpOptions"
          :invalid-messages="dhcpOptionValueErrors"
          :invalid-key-messages="dhcpOptionKeyErrors"
          :key-input-placeholder="t('standalone.dns_dhcp.dhcp_option_combobox_placeholder')"
          ><template #tooltip>
            <NeTooltip>
              <template #content>
                {{ t('standalone.dns_dhcp.dhcp_option_tooltip') }}
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
          @click="saveChanges()"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{ t('common.save') }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
</template>
