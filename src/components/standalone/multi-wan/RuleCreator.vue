<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeButton, NeCombobox, NeSideDrawer, NeTextInput } from '@nethserver/vue-tailwind-lib'
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
  validationErrors,
  isValid
} = useRuleForm(toRef(() => props.policies))

const saving = ref(false)
const error = ref<Error>()

function save() {
  if (isValid()) {
    saving.value = true
    ubusCall('ns.mwan', 'store_rule', {
      name: name.value,
      policy: policy.value,
      protocol: protocol.value,
      source_address: sourceAddress.value,
      source_port: sourcePort.value,
      destination_address: destinationAddress.value,
      destination_port: destinationPort.value
    })
      .then(() => emit('success'))
      .catch((reason: Error) => {
        if (reason instanceof ValidationError) {
          validationErrors.value = reason.errorBag
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
    :is-shown="isShown"
    :title="t('standalone.multi_wan.create_new_rule')"
    @close="$emit('cancel')"
  >
    <div class="space-y-8">
      <NeTextInput
        v-model="name"
        :disabled="saving"
        :invalid-message="validationErrors.getFirstFor('name')"
        :label="t('standalone.multi_wan.rule_name')"
        :placeholder="t('standalone.multi_wan.rule_name')"
        name="rule_name"
      />
      <NeCombobox
        v-model="policy"
        :disabled="saving"
        :invalid-message="validationErrors.getFirstFor('policy')"
        :label="t('standalone.multi_wan.assigned_policy')"
        :options="policyDropdownOptions"
        :placeholder="policyDropdownPlaceholder"
        name="policy"
      />
      <NeCombobox
        v-model="protocol"
        :disabled="saving"
        :invalid-message="validationErrors.getFirstFor('protocol')"
        :label="t('standalone.multi_wan.protocol')"
        :options="protocolOptions"
        :placeholder="protocolOptions[0].label"
        name="protocol"
      />
      <NeTextInput
        v-model="sourceAddress"
        :disabled="saving"
        :invalid-message="validationErrors.getFirstFor('source_address')"
        :label="t('standalone.multi_wan.source_address')"
        name="source_address"
        placeholder="any"
      />
      <NeTextInput
        v-if="protocol == 'tcp' || protocol == 'udp'"
        v-model="sourcePort"
        :disabled="saving"
        :invalid-message="validationErrors.getFirstFor('source_port')"
        :label="t('standalone.multi_wan.source_port')"
        :placeholder="t('standalone.multi_wan.any')"
        name="source_port"
      />
      <NeTextInput
        v-model="destinationAddress"
        :disabled="saving"
        :invalid-message="validationErrors.getFirstFor('destination_address')"
        :label="t('standalone.multi_wan.destination_address')"
        :placeholder="t('standalone.multi_wan.any')"
        name="destination_address"
      />
      <NeTextInput
        v-if="protocol == 'tcp' || protocol == 'udp'"
        v-model="destinationPort"
        :disabled="saving"
        :invalid-message="validationErrors.getFirstFor('destination_port')"
        :label="t('standalone.multi_wan.destination_port')"
        :placeholder="t('standalone.multi_wan.any')"
        name="destination_port"
      />
      <hr />
      <div class="flex justify-end gap-4">
        <NeButton :disabled="saving" :kind="'secondary'" @click="emit('cancel')">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton :disabled="saving" :kind="'primary'" :loading="saving" @click="save()">
          {{ t('common.save') }}
        </NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
