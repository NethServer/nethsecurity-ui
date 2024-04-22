<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { DpiException } from './DpiExceptions.vue'
import { ref } from 'vue'
import {
  MessageBag,
  validateIpAddress,
  validateRequired,
  type validationOutput
} from '@/lib/validation'
import { watch } from 'vue'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'
import {
  NeInlineNotification,
  NeSideDrawer,
  NeButton,
  NeFormItemLabel,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeToggle } from '@nethesis/vue-components'

const props = defineProps<{
  isShown: boolean
  itemToEdit: DpiException | null
}>()

const { t } = useI18n()

const emit = defineEmits(['close', 'add-edit-exception'])

const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const validationErrorBag = ref(new MessageBag())

// Form fields
const id = ref('')
const enabled = ref(true)
const ipAddress = ref('')
const exceptionName = ref('')

function resetForm() {
  id.value = props.itemToEdit?.['config-name'] ?? ''
  enabled.value = props.itemToEdit?.enabled ?? true
  ipAddress.value = props.itemToEdit?.criteria ?? ''
  exceptionName.value = props.itemToEdit?.description ?? ''
}

function runValidators(validators: validationOutput[], label: string): boolean {
  for (let validator of validators) {
    if (!validator.valid) {
      validationErrorBag.value.set(label, [validator.errMessage as string])
    }
  }

  return validators.every((validator) => validator.valid)
}

function validate() {
  validationErrorBag.value.clear()

  const validators: [validationOutput[], string][] = [
    [[validateRequired(exceptionName.value)], 'description'],
    [[validateRequired(ipAddress.value), validateIpAddress(ipAddress.value)], 'criteria']
  ]

  return validators
    .map(([validator, label]) => runValidators(validator, label))
    .every((result) => result)
}

async function createOrEditException() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  validationErrorBag.value.clear()

  const isEditing = id.value != ''

  try {
    isSavingChanges.value = true
    const requestType = isEditing ? 'edit-exemption' : 'add-exemption'

    if (validate()) {
      let payload: {
        'config-name'?: string
        description: string
        criteria: string
        enabled: boolean
      } = {
        criteria: ipAddress.value,
        description: exceptionName.value,
        enabled: enabled.value
      }

      if (isEditing) {
        payload['config-name'] = id.value
      }

      await ubusCall('ns.dpi', requestType, payload)
      emit('add-edit-exception')
      close()
    }
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationErrorBag.value = err.errorBag
    } else {
      error.value.notificationTitle = isEditing
        ? t('error.cannot_edit_dpi_exception')
        : t('error.cannot_create_dpi_exception')
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    }
  } finally {
    isSavingChanges.value = false
  }
}

function close() {
  validationErrorBag.value.clear()
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  resetForm()
  emit('close')
}

watch(
  () => props.isShown,
  () => {
    resetForm()
  }
)
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="close()"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    :title="id ? t('standalone.dpi.edit_exception') : t('standalone.dpi.add_exception')"
  >
    <NeInlineNotification
      v-if="error.notificationTitle"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
    >
      <template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <div class="flex flex-col gap-y-6">
      <div>
        <NeFormItemLabel>{{ t('standalone.dpi.status') }}</NeFormItemLabel>
        <NeToggle v-model="enabled" :label="enabled ? t('common.enabled') : t('common.disabled')" />
      </div>
      <NeTextInput
        v-model="ipAddress"
        :label="t('standalone.dpi.ip_address')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('criteria'))"
      />
      <NeTextInput
        v-model="exceptionName"
        :label="t('standalone.dpi.exception_name')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('description'))"
      />
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="createOrEditException()"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{ id ? t('common.save') : t('standalone.dpi.add_exception') }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
</template>
