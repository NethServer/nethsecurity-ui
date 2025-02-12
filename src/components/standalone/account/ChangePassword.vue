<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import {
  NeInlineNotification,
  NeButton,
  NeTooltip,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  MessageBag,
  validatePassword,
  validateRequired,
  validateStringEqual
} from '@/lib/validation'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'

const { t } = useI18n()

const loginStore = useLoginStore()

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const validationBag = ref(new MessageBag())

const loading = ref(false)
const error = ref<Error>()
const success = ref(false)

const oldPasswordHtmlRef = ref<HTMLElement | null>()
const newPasswordHtmlRef = ref<HTMLElement | null>()
const confirmPasswordHtmlRef = ref<HTMLElement | null>()

watch(
  () => validationBag.value.keys(),
  () => {
    const validationErrors = Array.from(validationBag.value.keys())
    if (validationErrors.length != 0) {
      switch (validationErrors[0]) {
        case 'new_password':
          newPasswordHtmlRef.value?.focus()
          break
        case 'confirm_password':
          confirmPasswordHtmlRef.value?.focus()
          break
        case 'old_password':
          oldPasswordHtmlRef.value?.focus()
          break
      }
    }
  }
)

function validate(): boolean {
  validationBag.value.clear()
  let errMessage = validateRequired(oldPassword.value).errMessage
  if (errMessage) {
    validationBag.value.set('old_password', String(errMessage))
  }
  errMessage = validateRequired(newPassword.value).errMessage
  if (errMessage) {
    validationBag.value.set('new_password', String(errMessage))
  }
  errMessage = validatePassword(newPassword.value).errMessage
  if (errMessage) {
    validationBag.value.set('new_password', String(errMessage))
  }
  errMessage = validateStringEqual(newPassword.value, confirmPassword.value).errMessage
  if (errMessage) {
    validationBag.value.set('confirm_password', String(errMessage))
  }
  return validationBag.value.size == 0
}

function updatePassword() {
  if (validate()) {
    loading.value = true
    success.value = false
    ubusCall('ns.account', 'set-password', {
      old_password: oldPassword.value,
      username: loginStore.username,
      password: newPassword.value
    })
      .then(() => {
        success.value = true
        oldPassword.value = ''
        newPassword.value = ''
        confirmPassword.value = ''
      })
      .catch((reason: Error) => {
        if (reason instanceof ValidationError) {
          validationBag.value = reason.errorBag
        } else {
          error.value = reason
        }
      })
      .finally(() => (loading.value = false))
  }
}
</script>

<template>
  <div class="space-y-6">
    <NeInlineNotification v-if="error" :title="t(getAxiosErrorMessage(error))" kind="error" />
    <NeInlineNotification
      v-if="success"
      :title="t('standalone.change_password.success_message')"
      kind="success"
    />
    <NeTextInput
      ref="oldPasswordHtmlRef"
      v-model="oldPassword"
      :disabled="loading"
      :invalid-message="t(validationBag.getFirstI18nKeyFor('old_password'))"
      :label="t('standalone.change_password.old_password')"
      is-password
    />
    <NeTextInput
      ref="newPasswordHtmlRef"
      v-model="newPassword"
      :disabled="loading"
      :invalid-message="t(validationBag.getFirstFor('new_password'))"
      :label="t('standalone.change_password.new_password')"
      is-password
    >
      <template #tooltip>
        <NeTooltip>
          <template #content>
            {{ t('standalone.change_password.password_rules') }}
          </template>
        </NeTooltip>
      </template>
    </NeTextInput>
    <NeTextInput
      ref="confirmPasswordHtmlRef"
      v-model="confirmPassword"
      :disabled="loading"
      :invalid-message="t(validationBag.getFirstFor('confirm_password'))"
      :label="t('standalone.change_password.confirm_password')"
      is-password
    />
    <div class="flex justify-end">
      <NeButton :disabled="loading" :loading="loading" kind="primary" @click="updatePassword()">
        {{ t('common.save') }}
      </NeButton>
    </div>
  </div>
</template>
