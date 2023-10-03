<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { ref, toRef } from 'vue'
import { NeButton, NeCombobox, NeSideDrawer, NeTextInput } from '@nethserver/vue-tailwind-lib'
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
      destination_port: destinationPort.value
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
    @close="$emit('close')"
  >
    <div class="space-y-8">
      <NeTextInput
        v-model="name"
        :disabled="saving || rule?.name == 'ns_default_rule'"
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
        <NeButton :disabled="saving" :kind="'secondary'" @click="emit('close')">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton :disabled="saving" :kind="'primary'" :loading="saving" @click="save()">
          {{ t('common.save') }}
        </NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
