<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getName, isBond, isVlan } from '@/lib/standalone/network'
import { ubusCall } from '@/lib/standalone/ubus'
import { validateRequired, validateVlanId } from '@/lib/validation'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import {
  NeCombobox,
  type NeComboboxOption,
  NeInlineNotification,
  NeSideDrawer,
  NeButton,
  NeRadioSelection,
  NeTextInput,
  focusElement,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { cloneDeep } from 'lodash-es'
import { ref, watch, computed, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  networkConfig: {
    type: Object,
    required: true
  },
  allDevices: {
    type: Array,
    required: true
  },
  isShown: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

const vlanType = ref('8021q')
const vlanTypeRef = ref()
const vlanId = ref('')
const vlanIdRef = ref()
const baseDevice = ref('')
const baseDeviceRef = ref()
const internalAllDevices = ref<any[]>([])

const showAdvancedSettings = ref(false)

const vlanTypeOptions = [
  {
    id: '8021q',
    label: t('standalone.interfaces_and_devices.vlan_8021q')
  },
  {
    id: '8021ad',
    label: t('standalone.interfaces_and_devices.vlan_8021ad')
  }
]

const loading = ref({
  create: false
})

const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: '',
  vlanId: '',
  baseDevice: ''
})

const deviceName = computed(() => {
  return `${baseDevice.value}.${vlanId.value}`
})

const baseDeviceOptions: Ref<NeComboboxOption[]> = computed(() => {
  // remove loopback and vlan devices
  const filteredDevices = internalAllDevices.value.filter(
    (dev: any) => !['lo', 'ifb-dns'].includes(getName(dev)) && !isVlan(dev)
  )

  return filteredDevices.map((dev: any) => {
    // show linked interfaces near device name
    const ifacesFound = props.networkConfig.interface
      .filter((iface: any) => iface.device === dev.name)
      .map((iface: any) => iface['.name'])

    let description = ''

    if (isBond(dev)) {
      description = `(${t('standalone.interfaces_and_devices.bond')})`
    } else if (ifacesFound) {
      description = ifacesFound.join(', ')
    }

    // bond interfaces have '.name' attribute
    return { id: getName(dev), label: getName(dev), description }
  })
})

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      clearErrors()
      showAdvancedSettings.value = false
      // periodic devices reload can cause some glitches to NeCombobox
      internalAllDevices.value = cloneDeep(props.allDevices)
      vlanType.value = '8021q'
      vlanId.value = ''
      baseDevice.value = ''
      focusElement(vlanTypeRef)
    }
  }
)

function closeDrawer() {
  emit('close')
}

function clearErrors() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  error.value.vlanId = ''
  error.value.baseDevice = ''
}

async function createVlanDevice() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  const isValidationOk = validate()

  if (!isValidationOk) {
    return
  }
  loading.value.create = true

  try {
    await ubusCall('ns.devices', 'create-vlan-device', {
      vlan_type: vlanType.value,
      base_device_name: baseDevice.value,
      vlan_id: vlanId.value
    })
    emit('reloadData')
    closeDrawer()
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_create_device')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    loading.value.create = false
    await uciChangesStore.getChanges()
  }
}

function validate() {
  clearErrors()
  let isValidationOk = true

  // vlan id

  {
    // check required
    const { valid, errMessage } = validateRequired(vlanId.value)
    if (!valid) {
      error.value.vlanId = t(errMessage as string)
      if (isValidationOk) {
        isValidationOk = false
        focusElement(vlanIdRef)
      }
    } else {
      // check syntax
      {
        const { valid, errMessage, i18Params } = validateVlanId(vlanId.value)
        if (!valid) {
          error.value.vlanId = t(errMessage as string, i18Params as any)
          if (isValidationOk) {
            isValidationOk = false
            focusElement(vlanIdRef)
          }
        }
      }

      // check if device name is already used

      if (deviceName.value in props.allDevices) {
        error.value.vlanId = t('standalone.interfaces_and_devices.device_name_already_used', {
          name: deviceName.value
        })
        if (isValidationOk) {
          isValidationOk = false
          focusElement(vlanIdRef)
        }
      }
    }
  }

  // base device

  {
    // check required
    const { valid, errMessage } = validateRequired(baseDevice.value)
    if (!valid) {
      error.value.baseDevice = t(errMessage as string)
      if (isValidationOk) {
        isValidationOk = false
        focusElement(baseDeviceRef)
      }
    }
  }
  return isValidationOk
}
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    :title="t('standalone.interfaces_and_devices.create_vlan_device')"
    :close-aria-label="t('common.shell.close_side_drawer')"
    @close="closeDrawer"
  >
    <form>
      <div class="space-y-6">
        <!-- vlan id -->
        <NeTextInput
          ref="vlanIdRef"
          v-model.number="vlanId"
          :label="t('standalone.interfaces_and_devices.vlan_id')"
          :helper-text="t('standalone.interfaces_and_devices.vlan_id_helper')"
          type="number"
          min="1"
          max="4094"
          :invalid-message="t(error.vlanId)"
          :disabled="loading.create"
        />
        <!-- base device -->
        <NeCombobox
          ref="baseDeviceRef"
          v-model="baseDevice"
          :options="baseDeviceOptions"
          :label="t('standalone.interfaces_and_devices.base_device')"
          :invalid-message="error.baseDevice"
          :no-results-label="t('ne_combobox.no_results')"
          :limited-options-label="t('ne_combobox.limited_options_label')"
          :disabled="loading.create"
          :no-options-label="t('ne_combobox.no_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optional-label="t('common.optional')"
        />
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
        <template v-if="showAdvancedSettings">
          <!-- vlan type -->
          <NeRadioSelection
            ref="vlanTypeRef"
            v-model="vlanType"
            :label="t('standalone.interfaces_and_devices.device_type')"
            :options="vlanTypeOptions"
          />
        </template>
        <NeInlineNotification
          v-if="error.notificationTitle"
          kind="error"
          :title="error.notificationTitle"
          :description="error.notificationDescription"
        >
          <template v-if="error.notificationDetails" #details>
            {{ error.notificationDetails }}
          </template>
        </NeInlineNotification>
      </div>
      <!-- footer -->
      <hr class="my-8 border-gray-200 dark:border-gray-700" />
      <div class="flex justify-end">
        <NeButton
          kind="tertiary"
          size="lg"
          :disabled="loading.create"
          class="mr-3"
          @click.prevent="closeDrawer"
        >
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          kind="primary"
          size="lg"
          :disabled="loading.create"
          :loading="loading.create"
          @click.prevent="createVlanDevice"
        >
          {{ t('standalone.interfaces_and_devices.create_device') }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
