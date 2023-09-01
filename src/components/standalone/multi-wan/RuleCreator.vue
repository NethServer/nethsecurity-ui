<script lang="ts" setup>
import {
  getAxiosErrorMessage,
  NeButton,
  NeCombobox,
  NeInlineNotification,
  NeSkeleton,
  NeTextInput
} from '@nethserver/vue-tailwind-lib'
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosError } from 'axios'
import type { Form } from '@/composables/useRuleForm'
import { useRuleForm } from '@/composables/useRuleForm'
import { MessageBag } from '@/lib/validation'

const { t } = useI18n()

const emit = defineEmits(['cancelCreation', 'ruleCreated'])

const { protocolOptions, policyOptions, error: policyError, loading: policyLoading } = useRuleForm()

const form = reactive<Form>({
  name: '',
  assignedPolicy: '',
  sourceAddress: '',
  destinationAddress: '',
  destinationPort: '',
  protocol: ''
})

const saving = ref(false)
const saveError = ref<Error>()
const validationErrors = reactive(new MessageBag())

// TODO: implement validation
// You can put errors in validationErrors object, setting the errors using snake case of the form fields.
// validationErrors.set('assigned_policy', [t('error.generic_error')])
function validate() {
  return true
}

function save() {
  if (validate()) {
    saving.value = true
    ubusCall('uci', 'add', {
      config: 'mwan3',
      name: form.name,
      type: 'rule',
      values: {
        proto: form.protocol,
        src_ip: form.sourceAddress,
        dest_ip: form.destinationAddress,
        dest_port: form.destinationPort,
        sticky: '0',
        use_policy: form.assignedPolicy
      }
    })
      .then(() => {
        emit('ruleCreated')
      })
      .catch((error: AxiosError) => (saveError.value = new Error(t(getAxiosErrorMessage(error)))))
      .finally(() => (saving.value = false))
  }
}
</script>

<template>
  <NeInlineNotification v-if="saveError" :kind="'error'" :title="saveError.message" />
  <NeSkeleton v-if="policyLoading" :lines="20" />
  <NeInlineNotification v-if="policyError" :kind="'error'" :title="policyError.message" />
  <div v-else class="space-y-8">
    <NeTextInput
      v-model="form.name"
      :disabled="saving"
      :invalid-message="validationErrors.get('name')?.[0]"
      :label="t('standalone.multi_wan.rule_name')"
    />
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
      <NeButton :disabled="saving" :kind="'secondary'" @click="emit('cancelCreation')">
        {{ t('common.cancel') }}
      </NeButton>
      <NeButton :disabled="saving" :kind="'primary'" :loading="saving" @click="save()">
        {{ t('common.save') }}
      </NeButton>
    </div>
  </div>
</template>
