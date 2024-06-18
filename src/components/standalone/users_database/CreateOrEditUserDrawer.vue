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
  NeTooltip,
  NeToggle
} from '@nethesis/vue-components'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'
import type { User } from './UsersDatabaseManager.vue'

const props = defineProps<{
  isShown: boolean
  itemToEdit?: User
}>()

const { t } = useI18n()

const emit = defineEmits(['close', 'add-edit-user'])

const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const validationErrorBag = ref(new MessageBag())

// Form fields
const id = ref('')
const username = ref('')
const displayName = ref('')
const password = ref('')
const confirmPassword = ref('')
const admin = ref(false)

async function resetForm() {
  if (props.itemToEdit) {
    id.value = props.itemToEdit.id
    username.value = props.itemToEdit.name
    displayName.value = props.itemToEdit.description
    admin.value = props.itemToEdit.admin
  } else {
    id.value = ''
    username.value = ''
    displayName.value = ''
    admin.value = false
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
    validationErrorBag.value.set('name', [usernameValidator.errMessage as string])
    valid = false
  }

  if (password.value != '' || confirmPassword.value != '') {
    const passwordValidator = validatePassword(password.value)
    if (!passwordValidator.valid) {
      validationErrorBag.value.set('password', [passwordValidator.errMessage as string])
      valid = false
    } else {
      const confirmPasswordValidator = validateStringEqual(password.value, confirmPassword.value)
      if (!confirmPasswordValidator.valid) {
        validationErrorBag.value.set('confirmPassword', [
          confirmPasswordValidator.errMessage as string
        ])
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
    const requestType = id.value ? 'edit-local-user' : 'add-local-user'

    const payload: {
      id?: string
      name: string
      password?: string
      description: string
      database: string
      extra: {}
    } = {
      name: username.value,
      description: displayName.value,
      password: password.value,
      database: 'main',
      extra: {}
    }

    if (id.value) {
      payload.id = id.value
    }

    if (validate()) {
      await ubusCall('ns.users', requestType, payload)
      if (admin.value && !props.itemToEdit?.admin) {
        await ubusCall('ns.users', 'set-admin', { name: payload.name, database: 'main' })
      } else if (!admin.value && props.itemToEdit?.admin) {
        await ubusCall('ns.users', 'remove-admin', { name: payload.name, database: 'main' })
      }
      emit('add-edit-user')
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
    :title="id ? t('standalone.users_database.edit_user') : t('standalone.users_database.add_user')"
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
        v-model.trim="username"
        :disabled="Boolean(id)"
        :label="t('standalone.users_database.username')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('name'))"
      />
      <NeTextInput
        v-model.trim="displayName"
        :label="t('standalone.users_database.display_name')"
        :optional="true"
        :optional-label="t('common.optional')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('description'))"
      />
      <NeTextInput
        v-model="password"
        :label="t('standalone.users_database.user_password')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('password'))"
        :optional="true"
        :optional-label="t('common.optional')"
        :is-password="true"
        :placeholder="id ? t('standalone.users_database.unchanged') : ''"
      />
      <ul class="list-inside list-disc text-sm font-normal text-gray-500 dark:text-gray-400">
        <li>{{ t('standalone.users_database.password_suggestion_1') }}</li>
        <li>{{ t('standalone.users_database.password_suggestion_2') }}</li>
        <li>{{ t('standalone.users_database.password_suggestion_3') }}</li>
        <li>{{ t('standalone.users_database.password_suggestion_4') }}</li>
        <li>{{ t('standalone.users_database.password_suggestion_5') }}</li>
      </ul>
      <NeTextInput
        v-model="confirmPassword"
        :label="t('standalone.users_database.confirm_user_password')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('confirmPassword'))"
        :optional="true"
        :optional-label="t('common.optional')"
        :is-password="true"
        :placeholder="id ? t('standalone.users_database.unchanged') : ''"
      />
      <NeToggle
        v-model="admin"
        :topLabel="t('standalone.users_database.administrator')"
        :label="admin ? t('common.enabled') : t('common.disabled')"
      >
        <template #topTooltip>
          <NeTooltip placement="top-start">
            <template #content>
              {{ t('standalone.users_database.administrator_tooltip') }}
            </template>
          </NeTooltip>
        </template>
      </NeToggle>
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="createOrEditUser()"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{ id ? t('common.save') : t('standalone.users_database.add_user') }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
</template>
