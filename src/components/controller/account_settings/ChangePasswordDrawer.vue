<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  MessageBag,
  validatePassword,
  validateRequired,
  validateStringEqual
} from '@/lib/validation'
import { useAccountsStore } from '@/stores/controller/accounts'
import {
  getAxiosErrorMessage,
  NeInlineNotification,
  NeSideDrawer,
  NeButton,
  NeTextInput,
  focusElement
} from '@nethesis/vue-components'
import { watch } from 'vue'

const { t } = useI18n()
const { changePassword } = useAccountsStore()

const props = defineProps<{
  isShown: boolean
}>()

const emit = defineEmits(['close', 'change-password'])

const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const validationErrorBag = ref(new MessageBag())

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const oldPasswordRef = ref()
const newPasswordRef = ref()
const confirmPasswordRef = ref()

function resetForm() {
  oldPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
}

function close() {
  validationErrorBag.value.clear()
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  emit('close')
}

function validate() {
  validationErrorBag.value.clear()
  let valid = true
  const requiredOldPasswordValidator = validateRequired(oldPassword.value)
  if (!requiredOldPasswordValidator.valid) {
    validationErrorBag.value.set('old_password', [
      requiredOldPasswordValidator.errMessage as string
    ])
    if (valid) {
      focusElement(oldPasswordRef)
      valid = false
    }
  }

  const requiredPasswordValidator = validateRequired(newPassword.value)
  if (!requiredPasswordValidator.valid) {
    validationErrorBag.value.set('new_password', [requiredPasswordValidator.errMessage as string])
    if (valid) {
      focusElement(newPasswordRef)
      valid = false
    }
  }

  const requiredConfirmPasswordValidator = validateRequired(confirmPassword.value)
  if (!requiredConfirmPasswordValidator.valid) {
    validationErrorBag.value.set('confirm_password', [
      requiredConfirmPasswordValidator.errMessage as string
    ])
    if (valid) {
      focusElement(confirmPasswordRef)
      valid = false
    }
  }

  if (newPassword.value != '' || confirmPassword.value != '') {
    const passwordValidator = validatePassword(newPassword.value)
    if (!passwordValidator.valid) {
      validationErrorBag.value.set('new_password', [passwordValidator.errMessage as string])
      if (valid) {
        focusElement(newPasswordRef)
        valid = false
      }
    } else {
      const confirmPasswordValidator = validateStringEqual(newPassword.value, confirmPassword.value)
      if (!confirmPasswordValidator.valid) {
        validationErrorBag.value.set('confirm_password', [
          confirmPasswordValidator.errMessage as string
        ])
        if (valid) {
          focusElement(confirmPasswordRef)
          valid = false
        }
      }
    }
  }

  return valid
}

async function performChangePassword() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''

  if (!validate()) {
    return
  }

  isSavingChanges.value = true
  try {
    await changePassword(oldPassword.value, newPassword.value)

    emit('change-password')
    close()
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_change_password')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    isSavingChanges.value = false
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
    :title="t('controller.account_settings.change_password')"
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
      </template>
    </NeInlineNotification>
    <div class="flex flex-col gap-y-6">
      <NeTextInput
        v-model="oldPassword"
        :label="t('controller.account_settings.current_password')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('old_password'))"
        :is-password="true"
        ref="oldPasswordRef"
      />
      <NeTextInput
        v-model="newPassword"
        :label="t('controller.account_settings.new_password')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('new_password'))"
        :is-password="true"
        ref="newPasswordRef"
      />
      <ul class="list-inside list-disc text-sm font-normal text-gray-500 dark:text-gray-400">
        <li>{{ t('controller.account_settings.password_suggestion_1') }}</li>
        <li>{{ t('controller.account_settings.password_suggestion_2') }}</li>
        <li>{{ t('controller.account_settings.password_suggestion_3') }}</li>
        <li>{{ t('controller.account_settings.password_suggestion_4') }}</li>
        <li>{{ t('controller.account_settings.password_suggestion_5') }}</li>
      </ul>
      <NeTextInput
        v-model="confirmPassword"
        :label="t('controller.account_settings.confirm_password')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('confirm_password'))"
        :is-password="true"
        ref="confirmPasswordRef"
      />
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="performChangePassword()"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{ t('common.save') }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
</template>
