<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  MessageBag,
  validatePassword,
  validateRequired,
  validateStringEqual
} from '@/lib/validation'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeInlineNotification,
  NeButton,
  NeSideDrawer,
  NeTextInput,
  getAxiosErrorMessage,
  focusElement
} from '@nethesis/vue-components'
import { ValidationError } from '@/lib/standalone/ubus'
import { useAccountsStore, type ControllerAccount } from '@/stores/controller/accounts'

const props = defineProps<{
  isShown: boolean
  itemToEdit?: ControllerAccount
}>()

const { t } = useI18n()
const accountsStore = useAccountsStore()

const emit = defineEmits(['close', 'add-user', 'edit-user'])

const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const validationErrorBag = ref(new MessageBag())

// Form fields
const id = ref<number>()
const username = ref('')
const displayName = ref('')
const password = ref('')
const confirmPassword = ref('')

// input refs
const usernameRef = ref()
const displayNameRef = ref()
const passwordRef = ref()
const confirmPasswordRef = ref()

async function resetForm() {
  if (props.itemToEdit) {
    id.value = props.itemToEdit.id
    username.value = props.itemToEdit.username
    displayName.value = props.itemToEdit.display_name
  } else {
    id.value = undefined
    username.value = ''
    displayName.value = ''
  }

  password.value = ''
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

  const usernameValidator = validateRequired(username.value)
  if (!usernameValidator.valid) {
    validationErrorBag.value.set('username', [usernameValidator.errMessage as string])
    if (valid) {
      focusElement(usernameRef)
      valid = false
    }
  }

  const displayNameValidator = validateRequired(displayName.value)
  if (!displayNameValidator.valid) {
    validationErrorBag.value.set('display_name', [usernameValidator.errMessage as string])
    if (valid) {
      focusElement(displayNameRef)
      valid = false
    }
  }

  if (!id.value) {
    const requiredPasswordValidator = validateRequired(password.value)
    if (!requiredPasswordValidator.valid) {
      validationErrorBag.value.set('password', [requiredPasswordValidator.errMessage as string])
      if (valid) {
        focusElement(passwordRef)
        valid = false
      }
    }

    const requiredConfirmPasswordValidator = validateRequired(confirmPassword.value)
    if (!requiredConfirmPasswordValidator.valid) {
      validationErrorBag.value.set('confirmPassword', [
        requiredConfirmPasswordValidator.errMessage as string
      ])
      if (valid) {
        focusElement(confirmPasswordRef)
        valid = false
      }
    }
  }

  const passwordValidator = validatePassword(password.value)
  // password format validator is checked only if we are adding a new user or
  // we are editing one and password field is not empty
  if (!passwordValidator.valid && (!id.value || password.value != '')) {
    validationErrorBag.value.set('password', [passwordValidator.errMessage as string])
    if (valid) {
      focusElement(passwordRef)
      valid = false
    }
  } else {
    const confirmPasswordValidator = validateStringEqual(password.value, confirmPassword.value)
    if (!confirmPasswordValidator.valid) {
      validationErrorBag.value.set('confirmPassword', [
        confirmPasswordValidator.errMessage as string
      ])
      if (valid) {
        focusElement(confirmPasswordRef)
        valid = false
      }
    }
  }

  return valid
}

async function createOrEditUser() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  validationErrorBag.value.clear()

  try {
    isSavingChanges.value = true

    if (validate()) {
      if (!id.value) {
        await accountsStore.addAccount(username.value, password.value, displayName.value)
        emit('add-user')
      } else {
        await accountsStore.updateAccount(
          id.value,
          username.value,
          password.value,
          displayName.value
        )
        emit('edit-user')
      }
      close()
    }
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationErrorBag.value = err.errorBag
    } else {
      error.value.notificationTitle = id.value
        ? t('error.cannot_edit_user')
        : t('error.cannot_create_user')
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    }
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
    :title="id ? t('controller.users.edit_user') : t('controller.users.add_user')"
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
      <NeTextInput
        v-model="username"
        :disabled="Boolean(id)"
        :label="t('controller.users.username')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('username'))"
        ref="usernameRef"
      />
      <NeTextInput
        v-model="displayName"
        :label="t('controller.users.display_name')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('display_name'))"
        ref="displayNameRef"
      />
      <NeTextInput
        v-model="password"
        :label="t('controller.users.user_password')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('password'))"
        :is-password="true"
        :placeholder="id ? t('controller.users.unchanged') : ''"
        ref="passwordRef"
      />
      <ul class="list-inside list-disc text-sm font-normal text-gray-500 dark:text-gray-400">
        <li>{{ t('controller.users.password_suggestion_1') }}</li>
        <li>{{ t('controller.users.password_suggestion_2') }}</li>
        <li>{{ t('controller.users.password_suggestion_3') }}</li>
        <li>{{ t('controller.users.password_suggestion_4') }}</li>
        <li>{{ t('controller.users.password_suggestion_5') }}</li>
      </ul>
      <NeTextInput
        v-model="confirmPassword"
        :label="t('controller.users.confirm_user_password')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('confirmPassword'))"
        :is-password="true"
        :placeholder="id ? t('controller.users.unchanged') : ''"
        ref="confirmPasswordRef"
      />
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="createOrEditUser()"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{ id ? t('common.save') : t('controller.users.add_user') }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
</template>
