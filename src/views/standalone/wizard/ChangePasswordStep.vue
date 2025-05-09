<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  focusElement,
  getAxiosErrorMessage,
  NeButton,
  NeHeading,
  NeInlineNotification,
  NeTextInput
} from '@nethesis/vue-components'
import { faArrowRight, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { onMounted, ref } from 'vue'
import {
  MessageBag,
  validatePassword,
  validateRequired,
  validateStringEqual
} from '@/lib/validation'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import { useSetupWizardStore } from '@/stores/standalone/setupWizard'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

const emit = defineEmits<{
  nextStep: []
  previousStep: []
}>()

const { t } = useI18n()
const wizardStore = useSetupWizardStore()
const loginStore = useLoginStore()
const uciChangesStore = useUciPendingChangesStore()
const username = ref('root')
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const oldPasswordRef = ref()
const newPasswordRef = ref()
const confirmPasswordRef = ref()
const validationErrorBag = ref(new MessageBag())
const loadingSetPassword = ref(false)
const loadingCommitChanges = ref(false)
const errorSetPassword = ref('')
const errorSetPasswordDetails = ref('')
const errorCommitChanges = ref('')
const errorCommitChangesDetails = ref('')

onMounted(() => {
  // clear password fields
  oldPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''

  // focus on the first field
  focusElement(oldPasswordRef)
})

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

async function changeRootPassword() {
  errorSetPassword.value = ''
  errorSetPasswordDetails.value = ''

  if (!validate()) {
    return
  }
  loadingSetPassword.value = true

  ubusCall('ns.account', 'set-password', {
    old_password: oldPassword.value,
    username: loginStore.username,
    password: newPassword.value
  })
    .then(() => {
      setPasswordChanged()
    })
    .catch((err: Error) => {
      if (err instanceof ValidationError) {
        validationErrorBag.value = err.errorBag
      } else {
        errorSetPassword.value = t(getAxiosErrorMessage(err))
        errorSetPasswordDetails.value = String(err)
      }
    })
    .finally(() => (loadingSetPassword.value = false))
}

async function setPasswordChanged() {
  await wizardStore.setPasswordChanged(true)
  await uciChangesStore.getChanges()

  // apply uci changes

  errorCommitChanges.value = ''
  errorCommitChangesDetails.value = ''
  loadingCommitChanges.value = true

  try {
    await uciChangesStore.commitChanges(false)
    emit('nextStep')
  } catch (err: unknown) {
    console.error(err)
    errorCommitChanges.value = t(getAxiosErrorMessage(err))
    errorCommitChangesDetails.value = String(err)
  } finally {
    uciChangesStore.getChanges()
    loadingCommitChanges.value = false
  }
}
</script>

<template>
  <div class="space-y-2">
    <NeHeading tag="h2">
      {{ t('standalone.wizard.change_root_password') }}
    </NeHeading>
    <p>{{ t('standalone.wizard.change_root_password_description') }}</p>
    <form class="space-y-6">
      <!-- username: needed only for accessibility and password managers: https://www.chromium.org/developers/design-documents/create-amazing-password-forms/ -->
      <div class="hidden max-w-sm">
        <NeTextInput v-model="username" autocomplete="username" class="hidden" />
      </div>
      <div class="max-w-sm">
        <NeTextInput
          ref="oldPasswordRef"
          v-model="oldPassword"
          :label="t('standalone.wizard.current_password')"
          :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('old_password'))"
          :is-password="true"
          autocomplete="current-password"
        />
      </div>
      <div class="space-y-2">
        <div class="max-w-sm">
          <NeTextInput
            ref="newPasswordRef"
            v-model="newPassword"
            :label="t('standalone.wizard.new_password')"
            :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('new_password'))"
            :is-password="true"
            autocomplete="new-password"
          />
        </div>
        <ul class="list-inside list-disc text-sm font-normal text-gray-500 dark:text-gray-400">
          <li>{{ t('standalone.wizard.password_suggestion_1') }}</li>
          <li>{{ t('standalone.wizard.password_suggestion_2') }}</li>
          <li>{{ t('standalone.wizard.password_suggestion_3') }}</li>
          <li>{{ t('standalone.wizard.password_suggestion_4') }}</li>
          <li>{{ t('standalone.wizard.password_suggestion_5') }}</li>
          <li>{{ t('standalone.wizard.password_suggestion_6') }}</li>
        </ul>
      </div>
      <div class="max-w-sm">
        <NeTextInput
          ref="confirmPasswordRef"
          v-model="confirmPassword"
          :label="t('standalone.wizard.confirm_password')"
          :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('confirm_password'))"
          :is-password="true"
          autocomplete="new-password"
        />
      </div>
      <!-- set password error notification -->
      <NeInlineNotification
        v-if="errorSetPassword"
        kind="error"
        :title="t('error.cannot_change_password')"
        :description="errorSetPassword"
      >
        <template v-if="errorSetPasswordDetails" #details>
          {{ errorSetPasswordDetails }}
        </template>
      </NeInlineNotification>
      <!-- set wizard error notification -->
      <NeInlineNotification
        v-if="wizardStore.errorSetWizardConfig"
        kind="error"
        :title="t('standalone.wizard.cannot_save_wizard_configuration')"
        :description="wizardStore.errorSetWizardConfig"
      >
        <template v-if="wizardStore.errorSetWizardConfigDetails" #details>
          {{ wizardStore.errorSetWizardConfigDetails }}
        </template>
      </NeInlineNotification>
      <!-- commit changes error notification -->
      <NeInlineNotification
        v-if="errorCommitChanges"
        kind="error"
        :title="t('error.cannot_apply_configuration_changes')"
        :description="errorCommitChanges"
      >
        <template v-if="errorCommitChangesDetails" #details>
          {{ errorCommitChangesDetails }}
        </template>
      </NeInlineNotification>
      <!-- footer -->
      <hr />
      <div class="flex flex-row-reverse gap-6">
        <NeButton
          kind="primary"
          size="lg"
          type="submit"
          :disabled="
            loadingSetPassword ||
            wizardStore.loadingGetWizardConfig ||
            wizardStore.loadingSetWizardConfig ||
            loadingCommitChanges
          "
          :loading="
            loadingSetPassword ||
            wizardStore.loadingGetWizardConfig ||
            wizardStore.loadingSetWizardConfig ||
            loadingCommitChanges
          "
          @click.prevent="changeRootPassword"
        >
          <template #suffix>
            <FontAwesomeIcon :icon="faArrowRight" aria-hidden="true" class="h-4 w-4" />
          </template>
          {{ t('standalone.wizard.apply_and_continue') }}
        </NeButton>
        <NeButton kind="tertiary" size="lg" @click.prevent="emit('previousStep')">
          <template #prefix>
            <FontAwesomeIcon :icon="faArrowLeft" aria-hidden="true" class="h-4 w-4" />
          </template>
          {{ t('common.previous') }}
        </NeButton>
      </div>
    </form>
  </div>
</template>
