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
  NeTooltip
} from '@nethesis/vue-components'
import { NeTextInput } from '@nethserver/vue-tailwind-lib'
import { watch } from 'vue'

const { t } = useI18n()
const { generateSshKeys } = useAccountsStore()

const props = defineProps<{
  isShown: boolean
}>()

const emit = defineEmits(['close', 'generate-key-pair'])

const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const validationErrorBag = ref(new MessageBag())

const passphrase = ref('')
const confirmPassphrase = ref('')

function resetForm() {
  passphrase.value = ''
  confirmPassphrase.value = ''
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

  const requiredPasswordValidator = validateRequired(passphrase.value)
  if (!requiredPasswordValidator.valid) {
    validationErrorBag.value.set('passphrase', [requiredPasswordValidator.errMessage as string])
    valid = false
  }

  const requiredConfirmPasswordValidator = validateRequired(passphrase.value)
  if (!requiredConfirmPasswordValidator.valid) {
    validationErrorBag.value.set('confirm_passphrase', [
      requiredConfirmPasswordValidator.errMessage as string
    ])
    valid = false
  }

  if (passphrase.value != '' || confirmPassphrase.value != '') {
    //TODO: validate string length instead of password
    const passwordValidator = validateRequired(passphrase.value)
    if (!passwordValidator.valid) {
      validationErrorBag.value.set('passphrase', [passwordValidator.errMessage as string])
      valid = false
    } else {
      const confirmPasswordValidator = validateStringEqual(
        passphrase.value,
        confirmPassphrase.value
      )
      if (!confirmPasswordValidator.valid) {
        validationErrorBag.value.set('confirm_passphrase', [
          confirmPasswordValidator.errMessage as string
        ])
        valid = false
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
    await generateSshKeys(passphrase.value)

    emit('generate-key-pair')
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
    :title="t('controller.account_settings.generate_ssh_key_pair')"
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
        v-model="passphrase"
        :label="t('controller.account_settings.new_passphrase')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('passphrase'))"
        :is-password="true"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('controller.account_settings.new_passphrase_tooltip') }}
            </template>
          </NeTooltip>
        </template>
      </NeTextInput>
      <NeTextInput
        v-model="confirmPassphrase"
        :label="t('controller.account_settings.confirm_passphrase')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('confirm_passphrase'))"
        :is-password="true"
      />
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="performChangePassword()"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{ t('controller.account_settings.generate_key') }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
</template>
