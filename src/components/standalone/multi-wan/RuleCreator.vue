<script lang="ts" setup>
import {
  NeButton,
  NeCombobox,
  NeComboboxOption,
  NeSideDrawer,
  NeSkeleton,
  NeTextInput
} from '@nethserver/vue-tailwind-lib'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { MessageBag, validateIp4Cidr, validatePortRange, validateRequired } from '@/lib/validation'
import { useMwan } from '@/composables/useMwan'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import type { AxiosError } from 'axios'

const { t } = useI18n()

const protocolOptions: NeComboboxOption[] = [
  {
    id: 'all',
    label: t('standalone.multi_wan.all_protocols')
  },
  {
    id: 'tcp',
    label: 'tcp'
  },
  {
    id: 'udp',
    label: 'udp'
  },
  {
    id: 'icmp',
    label: 'icmp'
  },
  {
    id: 'esp',
    label: 'esp'
  }
]

const emit = defineEmits<{
  success: []
  cancel: []
}>()

defineProps<{
  isShown: boolean
}>()

const mwan = reactive(useMwan())

const name = ref('')
const policy = ref('')
const protocol = ref('')
const sourceAddress = ref('')
const sourcePort = ref('')
const destinationAddress = ref('')
const destinationPort = ref('')

const policyDropdownOptions = computed((): NeComboboxOption[] => {
  return mwan.policies.map((policy) => ({
    id: policy.name,
    label: policy.label ?? policy.name
  }))
})

const policyDropdownPlaceholder = computed((): string => {
  if (policyDropdownOptions.value.length < 3) {
    return t('standalone.multi_wan.select_policy')
  }
  return policyDropdownOptions.value.map((option) => option.label).join(', ') + ',...'
})

const saving = ref(false)
const error = ref<Error>()
const validationErrors = ref(new MessageBag())

function isValid() {
  validationErrors.value.clear()
  let validationCheck = validateRequired(name.value)
  if (!validationCheck.valid) {
    validationErrors.value.set('name', t(String(validationCheck.errMessage)))
  }
  validationCheck = validateRequired(policy.value)
  if (!validationCheck.valid) {
    validationErrors.value.set('policy', t(String(validationCheck.errMessage)))
  }
  if (sourceAddress.value != '') {
    validationCheck = validateIp4Cidr(sourceAddress.value)
    if (!validationCheck.valid) {
      validationErrors.value.set('source_address', t(String(validationCheck.errMessage)))
    }
  }
  if (destinationAddress.value != '') {
    validationCheck = validateIp4Cidr(destinationAddress.value)
    if (!validationCheck.valid) {
      validationErrors.value.set('destination_address', t(String(validationCheck.errMessage)))
    }
  }
  if (protocol.value == 'tcp' || protocol.value == 'udp') {
    if (sourcePort.value != '') {
      validationCheck = validatePortRange(sourcePort.value)
      if (!validationCheck.valid) {
        validationErrors.value.set('source_port', t(String(validationCheck.errMessage)))
      }
    }
    if (destinationPort.value != '') {
      validationCheck = validatePortRange(destinationPort.value)
      if (!validationCheck.valid) {
        validationErrors.value.set('destination_port', t(String(validationCheck.errMessage)))
      }
    }
  }
  return validationErrors.value.size < 1
}

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
    <NeSkeleton v-if="mwan.loading" :lines="20" />
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
