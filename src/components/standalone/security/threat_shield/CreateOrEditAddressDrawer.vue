<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, watch } from 'vue'
import { MessageBag, validateAddress, validateRequired } from '@/lib/validation'
import {
  NeInlineNotification,
  NeSideDrawer,
  NeButton,
  NeTooltip,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'
import type { BanIpLocalAddress } from '@/views/standalone/security/ThreatShieldView.vue'

const props = defineProps<{
  isShown: boolean
  itemToEdit?: BanIpLocalAddress
  addressKind: 'block' | 'allow'
}>()

const { t } = useI18n()

const emit = defineEmits(['close', 'add-address', 'edit-address'])

const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const validationErrorBag = ref(new MessageBag())

// form fields
const address = ref('')
const description = ref('')

async function resetForm() {
  address.value = props.itemToEdit?.address ?? ''
  description.value = props.itemToEdit?.description ?? ''
}

function validate() {
  const requiredAddressValidator = validateRequired(address.value)
  const addressFormatValidator = validateAddress(address.value)

  if (!requiredAddressValidator.valid) {
    validationErrorBag.value.set('address', requiredAddressValidator.errMessage as string)
    return false
  }
  if (!addressFormatValidator.valid) {
    validationErrorBag.value.set('address', addressFormatValidator.errMessage as string)
    return false
  }

  return true
}

async function createOrEditAddress() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  const isEditing = Boolean(props.itemToEdit)
  let method = ''

  if (props.addressKind == 'block') {
    method = isEditing ? 'edit-blocked' : 'add-blocked'
  } else {
    method = isEditing ? 'edit-allowed' : 'add-allowed'
  }

  if (!validate()) {
    return
  }

  isSavingChanges.value = true
  try {
    await ubusCall('ns.threatshield', method, {
      address: address.value,
      description: description.value
    })
    isSavingChanges.value = false

    if (isEditing) {
      emit('edit-address')
    } else {
      emit('add-address')
    }

    close()
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationErrorBag.value = err.errorBag
    } else {
      error.value.notificationTitle = isEditing
        ? t('error.cannot_edit_address')
        : t('error.cannot_create_address')

      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    }
    isSavingChanges.value = false
    return
  }
}

function close() {
  if (!isSavingChanges.value) {
    validationErrorBag.value.clear()
    error.value.notificationTitle = ''
    error.value.notificationDescription = ''
    error.value.notificationDetails = ''
    emit('close')
  }
}

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      resetForm()
    }
  }
)
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="close()"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    :title="
      itemToEdit
        ? t('standalone.threat_shield.edit_address')
        : t('standalone.threat_shield.add_address')
    "
  >
    <NeInlineNotification
      v-if="error.notificationTitle"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
      ><template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <div class="flex flex-col gap-y-6">
      <NeTextInput
        v-model="address"
        :label="
          addressKind == 'block'
            ? t('standalone.threat_shield.blocked_address')
            : t('standalone.threat_shield.allowed_address')
        "
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('address'))"
        :disabled="Boolean(itemToEdit)"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.threat_shield.address_tooltip') }}
            </template>
          </NeTooltip>
        </template>
      </NeTextInput>
      <NeTextInput
        v-model="description"
        :label="t('standalone.threat_shield.description')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('description'))"
        :optional="true"
        :optional-label="t('common.optional')"
      />
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="createOrEditAddress()"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{
            Boolean(itemToEdit) ? t('common.save') : t('standalone.threat_shield.add_address')
          }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
</template>
