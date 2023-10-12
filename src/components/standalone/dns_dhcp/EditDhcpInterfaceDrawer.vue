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
  NeSideDrawer,
  NeInlineNotification,
  NeToggle,
  NeTextInput,
  NeButton,
  NeSkeleton,
  NeTooltip,
  getAxiosErrorMessage,
  type NeComboboxOption
} from '@nethserver/vue-tailwind-lib'
import NeMultiTextInput, { type KeyValueItem } from '../NeMultiTextInput.vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'

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
  notificationDescription: ''
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
      loading.value = false
    } catch (err: any) {
      error.value.notificationTitle = t('error.cannot_retrieve_interface_details')
      error.value.notificationDescription =
        err.response.data.message == 'interface_not_found'
          ? t('standalone.dns_dhcp.interface_not_found')
          : t(getAxiosErrorMessage(err))
    }
  } else {
    iface.value = ''
    enableDhcp.value = false
    rangeIpStart.value = ''
    rangeIpEnd.value = ''
    leaseTime.value = ''
    dhcpOptions.value = []
  }
}

function runValidators(validators: validationOutput[], label: string): boolean {
  for (let validator of validators) {
    if (!validator.valid) {
      validationErrorBag.value.set(label, [t(validator.errMessage as string)])
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
        label: dhcpOptionKey
      }
    })
    loading.value = false
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_dhcp_options')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
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
    [[validateRequired(rangeIpStart.value), validateIpAddress(rangeIpStart.value)], 'rangeIpStart'],
    [[validateRequired(rangeIpEnd.value), validateIpAddress(rangeIpEnd.value)], 'rangeIpEnd'],
    [[validateRequired(leaseTime.value), validateLeaseTime(leaseTime.value)], 'leaseTime']
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

  try {
    isSavingChanges.value = true

    if (validate()) {
      await ubusCall('ns.dhcp', 'edit-interface', {
        interface: iface.value,
        first: rangeIpStart.value,
        last: rangeIpEnd.value,
        active: enableDhcp.value,
        leasetime: leaseTime.value,
        options: dhcpOptions.value.map((option) => ({ [option.key]: option.value }))
      })
      emit('edit-interface')
      close()
    }
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_edit_interface')
    error.value.notificationDescription =
      err.response.data.message == 'interface_not_found'
        ? t('standalone.dns_dhcp.interface_not_found')
        : t(getAxiosErrorMessage(err))
  } finally {
    isSavingChanges.value = false
  }
}

function close() {
  validationErrorBag.value.clear()
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
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
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
    :title="t('standalone.dns_dhcp.edit_interface', { interface: iface })"
  >
    <NeInlineNotification
      v-if="error.notificationDescription"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
    />
    <NeSkeleton :lines="10" v-if="loading" />
    <div v-else class="flex flex-col gap-y-6">
      <NeToggle v-model="enableDhcp" :label="t('standalone.dns_dhcp.enable_dhcp')" />
      <NeTextInput
        v-model="rangeIpStart"
        :label="t('standalone.dns_dhcp.range_ip_start')"
        :invalid-message="validationErrorBag.getFirstFor('rangeIpStart')"
      />
      <NeTextInput
        v-model="rangeIpEnd"
        :label="t('standalone.dns_dhcp.range_ip_end')"
        :invalid-message="validationErrorBag.getFirstFor('rangeIpEnd')"
      />
      <NeTextInput
        v-model="leaseTime"
        :label="t('standalone.dns_dhcp.lease_time')"
        :invalid-message="validationErrorBag.getFirstFor('leaseTime')"
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
        <NeMultiTextInput
          v-model="dhcpOptions"
          :title="t('standalone.dns_dhcp.dhcp_option')"
          :use-key-combobox="true"
          :add-item-label="t('standalone.dns_dhcp.add_dhcp_option')"
          :optional="true"
          :optional-label="t('common.optional')"
          :key-options="availableDhcpOptions"
          :invalid-messages="dhcpOptionValueErrors"
          :invalid-key-messages="dhcpOptionKeyErrors"
          :combobox-placeholder="t('standalone.dns_dhcp.dhcp_option_combobox_placeholder')"
          :text-input-placeholder="t('standalone.dns_dhcp.dhcp_option_text_input_placeholder')"
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
