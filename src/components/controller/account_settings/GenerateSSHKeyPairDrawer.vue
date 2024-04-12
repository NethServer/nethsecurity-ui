<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  MessageBag,
  validateRequired,
  validateSshKeyPassphrase,
  validateStringEqual
} from '@/lib/validation'
import { useAccountsStore } from '@/stores/controller/accounts'
import {
  getAxiosErrorMessage,
  NeInlineNotification,
  NeSideDrawer,
  NeButton,
  NeTooltip,
  NeTextInput,
  focusElement
} from '@nethesis/vue-components'
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

const passphraseRef = ref()
const confirmPassphraseRef = ref()

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

  const requiredPassphraseValidator = validateRequired(passphrase.value)
  if (!requiredPassphraseValidator.valid) {
    validationErrorBag.value.set('passphrase', [requiredPassphraseValidator.errMessage as string])
    if (valid) {
      focusElement(passphraseRef)
      valid = false
    }
  }

  const requiredConfirmPassphraseValidator = validateRequired(confirmPassphrase.value)
  if (!requiredConfirmPassphraseValidator.valid) {
    validationErrorBag.value.set('confirm_passphrase', [
      requiredConfirmPassphraseValidator.errMessage as string
    ])
    if (valid) {
      focusElement(confirmPassphraseRef)
      valid = false
    }
  }

  if (passphrase.value != '' || confirmPassphrase.value != '') {
    const passphraseFormatValidator = validateSshKeyPassphrase(passphrase.value)
    if (!passphraseFormatValidator.valid) {
      validationErrorBag.value.set('passphrase', [passphraseFormatValidator.errMessage as string])
      if (valid) {
        focusElement(passphraseRef)
        valid = false
      }
    } else {
      const confirmPassphraseEqualValidator = validateStringEqual(
        passphrase.value,
        confirmPassphrase.value
      )
      if (!confirmPassphraseEqualValidator.valid) {
        validationErrorBag.value.set('confirm_passphrase', [
          confirmPassphraseEqualValidator.errMessage as string
        ])
        if (valid) {
          focusElement(confirmPassphraseRef)
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
    await generateSshKeys(passphrase.value)

    emit('generate-key-pair')
    close()
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_generate_ssh_key_pair')
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
    <div class="space-y-6">
      <!-- generate key pair description -->
      <NeInlineNotification
        kind="info"
        :title="t('controller.account_settings.generate_ssh_key_pair')"
        :description="t('controller.account_settings.generate_ssh_key_pair_description')"
        :closeAriaLabel="t('common.close')"
        :showDetailsLabel="t('notifications.show_details')"
      />
      <!-- error notification -->
      <NeInlineNotification
        v-if="error.notificationTitle"
        :title="error.notificationTitle"
        :description="error.notificationDescription"
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
          :helper-text="t('controller.account_settings.minimum_characters')"
          ref="passphraseRef"
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
          ref="confirmPassphraseRef"
        />
        <hr />
        <div class="flex justify-end">
          <NeButton kind="tertiary" class="mr-4" @click="close()">{{
            t('common.cancel')
          }}</NeButton>
          <NeButton
            kind="primary"
            @click="performChangePassword()"
            :disabled="isSavingChanges"
            :loading="isSavingChanges"
            >{{ t('controller.account_settings.generate_key') }}</NeButton
          >
        </div>
      </div>
    </div>
  </NeSideDrawer>
</template>
