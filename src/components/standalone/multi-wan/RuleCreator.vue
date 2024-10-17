<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import {
  NeButton,
  NeCombobox,
  NeRadioSelection,
  NeSideDrawer,
  NeTextInput,
  NeToggle,
  NeTooltip
} from '@nethesis/vue-components'
import { ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Policy } from '@/composables/useMwan'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import { useRuleForm } from '@/composables/useRuleForm'

const { t } = useI18n()

const emit = defineEmits<{
  success: []
  cancel: []
}>()

const props = defineProps<{
  isShown: boolean
  policies: Policy[]
}>()

const {
  policyDropdownOptions,
  protocolOptions,
  policyDropdownPlaceholder,
  name,
  policy,
  protocol,
  sourceAddress,
  sourcePort,
  destinationAddress,
  destinationPort,
  sticky,
  validationErrors,
  isValid,
  srcAddressOptions,
  dstAddressOptions,
  srcType,
  dstType,
  objectsLoading,
  srcObject,
  srcObjectOptions,
  dstObject,
  dstObjectOptions
} = useRuleForm(toRef(() => props.policies))

const saving = ref(false)
const error = ref<Error>()

function close() {
  emit('cancel')
  cleanForm()
}
function cleanForm() {
  name.value = ''
  policy.value = ''
  protocol.value = ''
  sourceAddress.value = ''
  sourcePort.value = ''
  destinationAddress.value = ''
  destinationPort.value = ''
  validationErrors.value.clear()
  sticky.value = false
  srcType.value = 'address'
  dstType.value = 'address'
  srcObject.value = ''
  dstObject.value = ''
}

type Payload = {
  name: string
  policy: string
  protocol: string
  source_address?: string
  source_port: string
  destination_address?: string
  destination_port: string
  sticky: boolean
  ns_src?: string
  ns_dst?: string
}

function save() {
  if (isValid()) {
    saving.value = true
    const payload: Payload = {
      name: name.value,
      policy: policy.value,
      protocol: protocol.value,
      source_port: sourcePort.value,
      destination_port: destinationPort.value,
      sticky: sticky.value
    }
    switch (srcType.value) {
      case 'address':
        payload.source_address = sourceAddress.value
        break
      case 'object':
        payload.ns_src = srcObject.value
        break
      default:
        payload.source_address = ''
        break
    }
    switch (dstType.value) {
      case 'address':
        payload.destination_address = destinationAddress.value
        break
      case 'object':
        payload.ns_dst = dstObject.value
        break
      default:
        payload.destination_address = ''
        break
    }
    ubusCall('ns.mwan', 'store_rule', payload)
      .then(() => emit('success'))
      .catch((reason: Error) => {
        if (reason instanceof ValidationError) {
          validationErrors.value = reason.errorBag
        } else {
          error.value = reason
        }
      })
      .finally(() => {
        saving.value = false
        cleanForm()
      })
  }
}
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    :title="t('standalone.multi_wan.create_new_rule')"
    @close="close()"
  >
    <div class="space-y-8">
      <NeTextInput
        v-model.trim="name"
        :disabled="saving"
        :invalid-message="validationErrors.getFirstFor('name')"
        :label="t('standalone.multi_wan.rule_name')"
        :placeholder="t('standalone.multi_wan.rule_name')"
        name="rule_name"
      />
      <NeCombobox
        v-model="policy"
        :disabled="saving"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('policy'))"
        :label="t('standalone.multi_wan.assigned_policy')"
        :options="policyDropdownOptions"
        :placeholder="policyDropdownPlaceholder"
        name="policy"
        :noResultsLabel="t('ne_combobox.no_results')"
        :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
        :noOptionsLabel="t('ne_combobox.no_options_label')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
        :optionalLabel="t('common.optional')"
      />
      <NeCombobox
        v-model="protocol"
        :disabled="saving"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('protocol'))"
        :label="t('standalone.multi_wan.protocol')"
        :options="protocolOptions"
        :placeholder="protocolOptions[0].label"
        name="protocol"
        :noResultsLabel="t('ne_combobox.no_results')"
        :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
        :noOptionsLabel="t('ne_combobox.no_options_label')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
        :optionalLabel="t('common.optional')"
      />
      <NeRadioSelection
        v-model="srcType"
        :disabled="saving"
        :label="t('standalone.multi_wan.source_type')"
        :options="srcAddressOptions"
      />
      <NeTextInput
        v-if="srcType == 'address'"
        v-model.trim="sourceAddress"
        :disabled="saving"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('source_address'))"
        :label="t('standalone.multi_wan.source_address')"
        name="source_address"
      />
      <NeCombobox
        v-if="srcType == 'object'"
        v-model="srcObject"
        :disabled="saving"
        :label="t('standalone.multi_wan.source_object')"
        :options="srcObjectOptions"
        :placeholder="objectsLoading ? t('common.loading') : t('ne_combobox.choose')"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('ns_src'))"
        :optionalLabel="t('common.optional')"
        :noResultsLabel="t('ne_combobox.no_results')"
        :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
        :noOptionsLabel="t('ne_combobox.no_options_label')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
      />
      <NeTextInput
        v-if="protocol == 'tcp' || protocol == 'udp'"
        v-model.trim="sourcePort"
        :disabled="saving"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('source_port'))"
        :label="t('standalone.multi_wan.source_port')"
        :placeholder="t('standalone.multi_wan.any')"
        name="source_port"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.multi_wan.ports_tooltip') }}
            </template>
          </NeTooltip>
        </template>
      </NeTextInput>
      <NeRadioSelection
        v-model="dstType"
        :disabled="saving"
        :label="t('standalone.multi_wan.destination_type')"
        :options="dstAddressOptions"
      />
      <NeTextInput
        v-if="dstType == 'address'"
        v-model.trim="destinationAddress"
        :disabled="saving"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('destination_address'))"
        :label="t('standalone.multi_wan.destination_address')"
        name="destination_address"
      />
      <NeCombobox
        v-if="dstType == 'object'"
        v-model="dstObject"
        :disabled="saving"
        :label="t('standalone.multi_wan.destination_object')"
        :options="dstObjectOptions"
        :placeholder="objectsLoading ? t('common.loading') : t('ne_combobox.choose')"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('ns_dst'))"
        :optionalLabel="t('common.optional')"
        :noResultsLabel="t('ne_combobox.no_results')"
        :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
        :noOptionsLabel="t('ne_combobox.no_options_label')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
      />
      <NeTextInput
        v-if="protocol == 'tcp' || protocol == 'udp'"
        v-model.trim="destinationPort"
        :disabled="saving"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('destination_port'))"
        :label="t('standalone.multi_wan.destination_port')"
        :placeholder="t('standalone.multi_wan.any')"
        name="destination_port"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.multi_wan.ports_tooltip') }}
            </template>
          </NeTooltip>
        </template>
      </NeTextInput>
      <NeToggle
        v-model="sticky"
        :topLabel="t('standalone.multi_wan.sticky')"
        :label="sticky ? t('common.enabled') : t('common.disabled')"
      >
        <template #topTooltip>
          <NeTooltip placement="top-start">
            <template #content>
              {{ t('standalone.multi_wan.sticky_tooltip') }}
            </template>
          </NeTooltip>
        </template>
      </NeToggle>
      <hr />
      <div class="flex justify-end gap-4">
        <NeButton :disabled="saving" :kind="'secondary'" @click="close()">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton :disabled="saving" :kind="'primary'" :loading="saving" @click="save()">
          {{ t('common.save') }}
        </NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
