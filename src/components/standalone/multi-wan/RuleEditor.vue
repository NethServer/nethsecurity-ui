<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { ref, toRef } from 'vue'
import {
  NeCombobox,
  NeButton,
  NeSideDrawer,
  NeTextInput,
  NeTooltip,
  NeToggle
} from '@nethesis/vue-components'
import { MessageBag } from '@/lib/validation'
import type { Policy, Rule } from '@/composables/useMwan'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import { useRuleForm } from '@/composables/useRuleForm'

const { t } = useI18n()

const props = defineProps<{
  rule: Rule | undefined
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
  isValid
} = useRuleForm(
  toRef(() => props.policies),
  toRef(() => props.rule)
)

const emit = defineEmits(['close', 'success'])

const saving = ref(false)
const messageBag = ref(new MessageBag())
const error = ref<Error>()

function close() {
  emit('close')
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
}
function save() {
  if (isValid()) {
    saving.value = true
    ubusCall('ns.mwan', 'edit_rule', {
      name: props.rule?.name,
      label: name.value,
      policy: policy.value,
      protocol: protocol.value,
      source_address: sourceAddress.value,
      source_port: sourcePort.value,
      destination_address: destinationAddress.value,
      destination_port: destinationPort.value,
      sticky: sticky.value
    })
      .then(() => emit('success'))
      .catch((reason: Error) => {
        if (reason instanceof ValidationError) {
          messageBag.value = reason.errorBag
        } else {
          error.value = reason
        }
      })
      .finally(() => (saving.value = false))
  }
}
</script>

<template>
  <NeSideDrawer
    :is-shown="rule != undefined"
    :title="t('standalone.multi_wan.edit_rule', { name: name })"
    @close="close()"
  >
    <div class="space-y-8">
      <NeTextInput
        v-model="name"
        disabled
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('name'))"
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
      <NeTextInput
        v-model="sourceAddress"
        :disabled="saving"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('source_address'))"
        :label="t('standalone.multi_wan.source_address')"
        name="source_address"
        placeholder="any"
      />
      <NeTextInput
        v-if="protocol == 'tcp' || protocol == 'udp'"
        v-model="sourcePort"
        :disabled="saving"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('source_port'))"
        :label="t('standalone.multi_wan.source_port')"
        :placeholder="t('standalone.multi_wan.any')"
        name="source_port"
      />
      <NeTextInput
        v-model="destinationAddress"
        :disabled="saving"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('destination_address'))"
        :label="t('standalone.multi_wan.destination_address')"
        :placeholder="t('standalone.multi_wan.any')"
        name="destination_address"
      />
      <NeTextInput
        v-if="protocol == 'tcp' || protocol == 'udp'"
        v-model="destinationPort"
        :disabled="saving"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('destination_port'))"
        :label="t('standalone.multi_wan.destination_port')"
        :placeholder="t('standalone.multi_wan.any')"
        name="destination_port"
      />
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
