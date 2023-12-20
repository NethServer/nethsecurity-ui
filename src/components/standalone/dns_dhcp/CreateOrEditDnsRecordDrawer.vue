<script setup lang="ts">
import { ref, toRefs } from 'vue'
import type { DnsRecord } from './DnsRecords.vue'
import {
  MessageBag,
  validateHostname,
  validateIpAddress,
  validateRequired,
  type validationOutput
} from '@/lib/validation'
import { onMounted } from 'vue'
import { watchEffect } from 'vue'
import {
  NeSideDrawer,
  NeInlineNotification,
  NeToggle,
  NeTextInput,
  NeButton,
  getAxiosErrorMessage,
  NeTooltip
} from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'

const props = defineProps<{
  isShown: boolean
  itemToEdit: DnsRecord | null
}>()
const { isShown } = toRefs(props)

const { t } = useI18n()

const emit = defineEmits(['close', 'add-edit-record'])

const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: ''
})
const validationErrorBag = ref(new MessageBag())

// Form fields
const id = ref('')
const hostname = ref('')
const ipAddress = ref('')
const name = ref('')
const wildcard = ref(false)

function resetForm() {
  id.value = props.itemToEdit?.record ?? ''
  hostname.value = props.itemToEdit?.name ?? ''
  ipAddress.value = props.itemToEdit?.ip ?? ''
  name.value = props.itemToEdit?.description ?? ''
  wildcard.value = props.itemToEdit?.wildcard ?? false
}

function runValidators(validators: validationOutput[], label: string): boolean {
  for (let validator of validators) {
    if (!validator.valid) {
      validationErrorBag.value.set(label, [t(validator.errMessage as string)])
    }
  }

  return validators.every((validator) => validator.valid)
}

function validate() {
  validationErrorBag.value.clear()

  const validators: [validationOutput[], string][] = [
    [[validateRequired(hostname.value), validateHostname(hostname.value)], 'hostname'],
    [[validateRequired(ipAddress.value), validateIpAddress(ipAddress.value)], 'ipAddress']
  ]

  return validators
    .map(([validator, label]) => runValidators(validator, label))
    .every((result) => result)
}

async function createOrEditDnsRecord() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  const isEditing = id.value != ''

  try {
    isSavingChanges.value = true
    const requestType = isEditing ? 'edit-record' : 'add-record'

    if (validate()) {
      let payload: {
        record?: string
        name: string
        ip: string
        description: string
        wildcard: boolean
      } = {
        name: hostname.value,
        ip: ipAddress.value,
        description: name.value,
        wildcard: wildcard.value
      }

      if (isEditing) {
        payload.record = id.value
      }

      await ubusCall('ns.dns', requestType, payload)
      emit('add-edit-record')
      close()
    }
  } catch (err: any) {
    error.value.notificationTitle = isEditing
      ? t('error.cannot_edit_dns_record')
      : t('error.cannot_create_dns_record')

    error.value.notificationDescription =
      err.response.data.message == 'record_not_found'
        ? t('standalone.dns_dhcp.record_not_found')
        : t(getAxiosErrorMessage(err))
  } finally {
    isSavingChanges.value = false
  }
}

function close() {
  validationErrorBag.value.clear()
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  resetForm()
  emit('close')
}

watchEffect(() => {
  resetForm()
})

onMounted(() => {
  resetForm()
})
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="close()"
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
    :title="id ? t('standalone.dns_dhcp.edit_dns_record') : t('standalone.dns_dhcp.add_dns_record')"
  >
    <NeInlineNotification
      v-if="error.notificationTitle"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
    />
    <div class="flex flex-col gap-y-6">
      <NeTextInput
        v-model="hostname"
        :label="t('standalone.dns_dhcp.hostname')"
        :invalid-message="validationErrorBag.getFirstFor('hostname')"
      />
      <NeTextInput
        v-model="ipAddress"
        :label="t('standalone.dns_dhcp.ip_address')"
        :invalid-message="validationErrorBag.getFirstFor('ipAddress')"
      />
      <NeTextInput
        v-model="name"
        :label="t('standalone.dns_dhcp.name')"
        :invalid-message="validationErrorBag.getFirstFor('name')"
        :optional="true"
        :optional-label="t('common.optional')"
      />
      <NeToggle v-model="wildcard" :label="t('standalone.dns_dhcp.wildcard_dns_record')">
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.dns_dhcp.wildcard_dns_record_tooltip') }}
            </template>
          </NeTooltip>
        </template></NeToggle
      >
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="createOrEditDnsRecord()"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{ t('common.save') }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
</template>
