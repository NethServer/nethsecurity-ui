<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import type { PropType } from 'vue'
import { reactive, ref } from 'vue'
import type { Rule } from '@/composables/useMwanConfig'
import type { Form } from '@/composables/useRuleForm'
import { useRuleForm } from '@/composables/useRuleForm'
import {
  NeButton,
  NeCombobox,
  NeInlineNotification,
  NeSkeleton,
  NeTextInput
} from '@nethserver/vue-tailwind-lib'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosError } from 'axios'
import { MessageBag } from '@/lib/validation'

const { t } = useI18n()

const { protocolOptions, policyOptions, error: policyError, loading: policyLoading } = useRuleForm()

const props = defineProps({
  rule: {
    type: Object as PropType<Rule>,
    required: true
  }
})

const emit = defineEmits(['cancel', 'success'])

const form = reactive<Form>({
  name: props.rule.name,
  assignedPolicy: props.rule.policy.name,
  sourceAddress: props.rule.source,
  destinationAddress: props.rule.destination,
  destinationPort: props.rule.destinationPort,
  protocol: props.rule.protocol
})
const saving = ref(false)
const editError = ref<Error>()
const validationErrors = reactive(new MessageBag())

// TODO: implement validation
// You can put errors in validationErrors object, setting the errors using snake case of the form fields.
// validationErrors.set('assigned_policy', [t('error.generic_error')])
function validate(): boolean {
  return true
}

function save() {
  if (validate()) {
    saving.value = true
    ubusCall('uci', 'set', {
      config: 'mwan3',
      section: props.rule.name,
      values: {
        proto: form.protocol,
        src_ip: form.sourceAddress,
        dest_port: form.destinationPort,
        dest_ip: form.destinationAddress,
        use_policy: form.assignedPolicy
      }
    })
      .then(() => emit('success'))
      .catch((error: AxiosError) => (editError.value = error))
      .finally(() => (saving.value = false))
  }
}
</script>

<template>
  <div class="space-y-8">
    <NeInlineNotification v-if="editError" :title="editError.message" kind="error" />
    <NeSkeleton v-if="policyLoading" :lines="20" />
    <NeInlineNotification v-else-if="policyError" :kind="'error'" :title="policyError.message" />
    <template v-else>
      <NeCombobox
        v-model="form.assignedPolicy"
        :disabled="saving"
        :invalid-message="validationErrors.get('assigned_policy')?.[0]"
        :label="t('standalone.multi_wan.assigned_policy')"
        :options="policyOptions"
      />
      <NeTextInput
        v-model="form.sourceAddress"
        :disabled="saving"
        :invalid-message="validationErrors.get('source_address')?.[0]"
        :label="t('standalone.multi_wan.source_address')"
      />
      <NeTextInput
        v-model="form.destinationAddress"
        :disabled="saving"
        :invalid-message="validationErrors.get('destination_address')?.[0]"
        :label="t('standalone.multi_wan.destination_address')"
      />
      <NeTextInput
        v-model="form.destinationPort"
        :disabled="saving"
        :invalid-message="validationErrors.get('destination_port')?.[0]"
        :label="t('standalone.multi_wan.destination_port')"
      />
      <NeCombobox
        v-model="form.protocol"
        :disabled="saving"
        :invalid-message="validationErrors.get('protocol')?.[0]"
        :label="t('standalone.multi_wan.protocol')"
        :options="protocolOptions"
      />
      <hr />
      <div class="flex justify-end gap-4">
        <NeButton :disabled="saving" :kind="'secondary'" @click="$emit('cancel')">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton :disabled="saving" :kind="'primary'" :loading="saving" @click="save()">
          {{ t('common.edit') }}
        </NeButton>
      </div>
    </template>
  </div>
</template>
