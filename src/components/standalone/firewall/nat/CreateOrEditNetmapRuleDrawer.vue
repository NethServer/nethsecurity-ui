<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeCombobox,
  type NeComboboxOption,
  NeInlineNotification,
  NeSideDrawer,
  NeButton,
  NeExpandable,
  NeTextInput,
  focusElement,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { ref, computed, type PropType, type Ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { type NetmapRule, type NetmapDevice, type NetmapType } from '@/stores/standalone/firewall'
import {
  MessageBag,
  validateIpCidr,
  validateRequired,
  type validationOutput
} from '@/lib/validation'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'

const props = defineProps({
  currentRule: {
    type: Object as PropType<NetmapRule>
  },
  netmapType: {
    type: String as PropType<NetmapType>
  },
  isShown: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const ruleName = ref('')
const ruleNameRef = ref()
const sourceNetwork = ref('')
const sourceNetworkRef = ref()
const destinationNetwork = ref('')
const destinationNetworkRef = ref()
const mapFrom = ref('')
const mapFromRef = ref()
const mapTo = ref('')
const mapToRef = ref()
const inboundDevices = ref<NeComboboxOption[]>([])
const inboundDevicesRef = ref()
const outboundDevices = ref<NeComboboxOption[]>([])
const outboundDevicesRef = ref()
const devicesOptions = ref<NeComboboxOption[]>([])
const isExpandedAdvancedSettings = ref(false)
const errorBag = ref(new MessageBag())
// contains the first invalid field ref
const firstErrorRef = ref()

const loading = ref({
  listDevices: false,
  saveRule: false
})

const error = ref({
  listDevices: '',
  listDevicesDetails: '',
  saveRule: '',
  saveRuleDetails: ''
})

const isCreatingRule = computed(() => {
  return !props.currentRule
})

const drawerTitle = computed(() => {
  if (isCreatingRule.value) {
    return props.netmapType == 'src'
      ? t('standalone.netmap.add_source_netmap')
      : t('standalone.netmap.add_destination_netmap')
  } else {
    return props.netmapType == 'src'
      ? t('standalone.netmap.edit_source_netmap')
      : t('standalone.netmap.edit_destination_netmap')
  }
})

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      clearErrors()
      errorBag.value.clear()

      nextTick(() => {
        focusElement(ruleNameRef)
      })
      listDevices()
      inboundDevices.value = []
      outboundDevices.value = []
      isExpandedAdvancedSettings.value = false

      if (isCreatingRule.value) {
        // creating rule, reset form to defaults
        ruleName.value = ''
        sourceNetwork.value = ''
        destinationNetwork.value = ''
        mapFrom.value = ''
        mapTo.value = ''
      } else if (props.currentRule) {
        // editing rule
        ruleName.value = props.currentRule.name || ''
        sourceNetwork.value = props.currentRule.src || ''
        destinationNetwork.value = props.currentRule.dest || ''
        mapFrom.value = props.currentRule.map_from || ''
        mapTo.value = props.currentRule.map_to || ''
        // inbound/outbound devices will be set inside listDevices
      }
    }
  }
)

function closeDrawer() {
  emit('close')
}

function clearErrors() {
  error.value.listDevices = ''
  error.value.listDevicesDetails = ''
  error.value.saveRule = ''
  error.value.saveRuleDetails = ''
}

async function listDevices() {
  error.value.listDevices = ''
  error.value.listDevicesDetails = ''
  loading.value.listDevices = true
  devicesOptions.value = []

  try {
    const res = await ubusCall('ns.netmap', 'list-devices')
    devicesOptions.value = res.data.devices.map((dev: NetmapDevice) => {
      return {
        id: dev.device,
        label: dev.device,
        description: dev.interface || ''
      }
    })

    if (props.currentRule) {
      // editing rule
      if (props.currentRule.device_in?.length) {
        inboundDevices.value = props.currentRule.device_in.map((deviceId) => {
          return devicesOptions.value.find((dev: NeComboboxOption) => dev.id === deviceId)
        })
        isExpandedAdvancedSettings.value = true
      }

      if (props.currentRule.device_out) {
        outboundDevices.value = props.currentRule.device_out.map((deviceId) => {
          return devicesOptions.value.find((dev: NeComboboxOption) => dev.id === deviceId)
        })
        isExpandedAdvancedSettings.value = true
      }
    }
  } catch (err: any) {
    console.error(err)
    error.value.listDevices = t(getAxiosErrorMessage(err))
    error.value.listDevicesDetails = err.toString()
  } finally {
    loading.value.listDevices = false
  }
}

function runFieldValidators(
  validators: validationOutput[],
  fieldName: string,
  fieldRef: Ref<any>
): boolean {
  for (const validator of validators) {
    if (!validator.valid) {
      errorBag.value.set(fieldName, [validator.errMessage as string])

      // remember the first field with error for focus management
      if (!firstErrorRef.value) {
        firstErrorRef.value = fieldRef
      }
    }
  }
  return validators.every((validator) => validator.valid)
}

function validate() {
  clearErrors()
  errorBag.value.clear()

  const sourceOrDestinationNetwork: [validationOutput[], string, Ref<any>] =
    props.netmapType === 'src'
      ? [
          [validateRequired(destinationNetwork.value), validateIpCidr(destinationNetwork.value)],
          'dest',
          destinationNetworkRef
        ]
      : [
          [validateRequired(sourceNetwork.value), validateIpCidr(sourceNetwork.value)],
          'src',
          sourceNetworkRef
        ]

  const allValidators: [validationOutput[], string, Ref<any>][] = [
    // rule name
    [[validateRequired(ruleName.value)], 'name', ruleNameRef],
    // source or destination network
    sourceOrDestinationNetwork,
    // mapFrom
    [[validateRequired(mapFrom.value), validateIpCidr(mapFrom.value)], 'map_from', mapFromRef],
    // mapTo
    [[validateRequired(mapTo.value), validateIpCidr(mapTo.value)], 'map_to', mapToRef]
  ]

  // reset firstErrorRef for focus management
  firstErrorRef.value = undefined

  const isValidationOk = allValidators
    .map(([validators, fieldName, fieldRef]) => runFieldValidators(validators, fieldName, fieldRef))
    .every((result) => result)

  if (firstErrorRef.value) {
    focusElement(firstErrorRef.value)
  }
  return isValidationOk
}

async function saveRule() {
  const isValidationOk = validate()
  if (!isValidationOk) {
    return
  }
  error.value.saveRule = ''
  error.value.saveRuleDetails = ''
  loading.value.saveRule = true

  const ruleData: NetmapRule = {
    name: ruleName.value,
    src: sourceNetwork.value,
    dest: destinationNetwork.value,
    map_from: mapFrom.value,
    map_to: mapTo.value,
    device_in: inboundDevices.value.map((dev: NeComboboxOption) => dev.id),
    device_out: outboundDevices.value.map((dev: NeComboboxOption) => dev.id)
  }

  if (props.currentRule) {
    // editing rule
    ruleData.id = props.currentRule.id
  }
  const apiMethod = isCreatingRule.value ? 'add-rule' : 'edit-rule'

  try {
    await ubusCall('ns.netmap', apiMethod, ruleData)
    emit('reloadData')
    closeDrawer()
  } catch (err: any) {
    console.error(err)

    if (err instanceof ValidationError) {
      errorBag.value = err.errorBag
    } else {
      error.value.saveRule = t(getAxiosErrorMessage(err))
      error.value.saveRuleDetails = err.toString()
    }
  } finally {
    loading.value.saveRule = false
  }
}
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    :title="drawerTitle"
    :close-aria-label="t('common.shell.close_side_drawer')"
    @close="closeDrawer"
  >
    <form>
      <div class="space-y-6">
        <!-- rule name -->
        <NeTextInput
          ref="ruleNameRef"
          v-model.trim="ruleName"
          :label="t('common.name')"
          :invalid-message="t(errorBag.getFirstI18nKeyFor('name'))"
          :disabled="loading.saveRule"
        />
        <!-- source network, show only for destination netmap -->
        <NeTextInput
          v-if="netmapType === 'dest'"
          ref="sourceNetworkRef"
          v-model.trim="sourceNetwork"
          :label="t('standalone.netmap.source_network')"
          :helper-text="t('standalone.netmap.network_cidr')"
          :invalid-message="t(errorBag.getFirstI18nKeyFor('src'))"
          :disabled="loading.saveRule"
        />
        <!-- destination network, show only for source netmap -->
        <NeTextInput
          v-else
          ref="destinationNetworkRef"
          v-model.trim="destinationNetwork"
          :label="t('standalone.netmap.destination_network')"
          :helper-text="t('standalone.netmap.network_cidr')"
          :invalid-message="t(errorBag.getFirstI18nKeyFor('dest'))"
          :disabled="loading.saveRule"
        />
        <div class="flex items-center">
          <!-- mapFrom -->
          <NeTextInput
            ref="mapFromRef"
            v-model.trim="mapFrom"
            :label="
              netmapType == 'src'
                ? t('standalone.netmap.source_network')
                : t('standalone.netmap.destination_network')
            "
            :helper-text="t('standalone.netmap.network_cidr')"
            :invalid-message="t(errorBag.getFirstI18nKeyFor('map_from'))"
            :disabled="loading.saveRule"
          />
          <!-- arrow icon -->
          <FontAwesomeIcon :icon="['fas', 'arrow-right']" class="px-4" />
          <!-- mapFrom -->
          <NeTextInput
            ref="mapToRef"
            v-model.trim="mapTo"
            :label="t('standalone.netmap.mapped_network')"
            :helper-text="t('standalone.netmap.network_cidr')"
            :invalid-message="t(errorBag.getFirstI18nKeyFor('map_to'))"
            :disabled="loading.saveRule"
          />
        </div>
        <!-- listDevices error notification -->
        <NeInlineNotification
          v-if="error.listDevices"
          kind="error"
          :title="t('error.cannot_retrieve_devices')"
          :description="error.listDevices"
        >
          <template v-if="error.listDevicesDetails" #details>
            {{ error.listDevicesDetails }}
          </template>
        </NeInlineNotification>
        <!-- advanced settings -->
        <NeExpandable
          :label="t('common.advanced_settings')"
          :is-expanded="isExpandedAdvancedSettings"
          @set-expanded="(ev: boolean) => (isExpandedAdvancedSettings = ev)"
        >
          <div class="space-y-6">
            <!-- inbound devices -->
            <NeCombobox
              ref="inboundDevicesRef"
              v-model="inboundDevices"
              :label="t('standalone.netmap.inbound_devices')"
              :options="devicesOptions"
              :placeholder="
                loading.listDevices ? t('common.loading') : t('ne_combobox.choose_multiple')
              "
              multiple
              :helper-text="t('standalone.netmap.device_helper')"
              :invalid-message="t(errorBag.getFirstI18nKeyFor('device_in'))"
              :disabled="loading.saveRule || loading.listDevices"
              :optional="true"
              :optional-label="t('common.optional')"
              :no-results-label="t('ne_combobox.no_results')"
              :limited-options-label="t('ne_combobox.limited_options_label')"
              :no-options-label="t('ne_combobox.no_options_label')"
              :selected-label="t('ne_combobox.selected')"
              :user-input-label="t('ne_combobox.user_input_label')"
            />
            <!-- outbound devices -->
            <NeCombobox
              ref="outboundDevicesRef"
              v-model="outboundDevices"
              :label="t('standalone.netmap.outbound_devices')"
              :options="devicesOptions"
              :placeholder="
                loading.listDevices ? t('common.loading') : t('ne_combobox.choose_multiple')
              "
              multiple
              :helper-text="t('standalone.netmap.device_helper')"
              :invalid-message="t(errorBag.getFirstI18nKeyFor('device_out'))"
              :disabled="loading.saveRule || loading.listDevices"
              :optional="true"
              :optional-label="t('common.optional')"
              :no-results-label="t('ne_combobox.no_results')"
              :limited-options-label="t('ne_combobox.limited_options_label')"
              :no-options-label="t('ne_combobox.no_options_label')"
              :selected-label="t('ne_combobox.selected')"
              :user-input-label="t('ne_combobox.user_input_label')"
            />
          </div>
        </NeExpandable>
        <!-- saveRule error notification -->
        <NeInlineNotification
          v-if="error.saveRule"
          kind="error"
          :title="t('error.cannot_save_netmap')"
          :description="error.saveRule"
        >
          <template v-if="error.saveRuleDetails" #details>
            {{ error.saveRuleDetails }}
          </template>
        </NeInlineNotification>
      </div>
      <!-- footer -->
      <hr class="my-8 border-gray-200 dark:border-gray-700" />
      <div class="flex justify-end">
        <NeButton
          kind="tertiary"
          size="lg"
          :disabled="loading.saveRule"
          class="mr-3"
          @click.prevent="closeDrawer"
        >
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          kind="primary"
          size="lg"
          :disabled="loading.saveRule || loading.listDevices"
          :loading="loading.saveRule"
          @click.prevent="saveRule"
        >
          {{
            isCreatingRule ? t('standalone.netmap.add_netmap') : t('standalone.netmap.save_netmap')
          }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
