<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  MessageBag,
  validateIpAddress,
  validatePositiveInteger,
  validateRequired,
  type validationOutput
} from '@/lib/validation'
import {
  NeInlineNotification,
  NeSideDrawer,
  NeButton,
  NeCombobox,
  NeSkeleton,
  type NeComboboxOption,
  NeFormItemLabel,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeToggle } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'
import type { RWServer, RWAccount } from '@/views/standalone/vpn/OpenvpnRoadWarriorView.vue'
import type { User } from '../users_database/UsersDatabaseManager.vue'

const props = defineProps<{
  isShown: boolean
  itemToEdit?: RWAccount
  instanceData: RWServer
  instanceName: string
}>()

const { t } = useI18n()

const emit = defineEmits(['close', 'add-account', 'edit-account'])

const loading = ref(false)
const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const validationErrorBag = ref(new MessageBag())

// form fields
const enabled = ref(true)
const username = ref('')
const reservedIp = ref('')
const certificateExpiration = ref('3650')

const usernameOptions = ref<NeComboboxOption[]>([])

async function fetchOptions() {
  try {
    loading.value = true
    usernameOptions.value = (
      await ubusCall('ns.users', 'list-users', {
        database: props.instanceData.ns_user_db
      })
    ).data.users.map((user: User) => ({
      id: user.name,
      label: user.name,
      description: user.description
    }))
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_users')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    loading.value = false
  }
}

async function resetForm() {
  enabled.value = props.itemToEdit ? props.itemToEdit.openvpn_enabled === '1' : true
  username.value = props.itemToEdit?.name ?? usernameOptions.value?.[0]?.id ?? ''
  reservedIp.value = props.itemToEdit?.openvpn_ipaddr ?? ''
  certificateExpiration.value = props.itemToEdit ? '' : '3650'
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

  // validators used only when creating an account
  const createAccountValidators: [validationOutput[], string][] = [
    [
      [
        validateRequired(certificateExpiration.value),
        validatePositiveInteger(certificateExpiration.value)
      ],
      'expiration'
    ]
  ]

  // applied only if reserved ip field is filled in
  const reservedIpValidator: [validationOutput[], string] = [
    [validateIpAddress(reservedIp.value)],
    'ipaddr'
  ]

  const validators: [validationOutput[], string][] = [
    [[validateRequired(username.value)], 'username'],
    ...(!reservedIp.value ? [] : [reservedIpValidator]),
    ...(props.itemToEdit ? [] : createAccountValidators)
  ]

  return validators
    .map(([validator, label]) => runValidators(validator, label))
    .every((result) => result)
}

async function createOrEditAccount() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  const isEditing = Boolean(props.itemToEdit)

  const requestType = isEditing ? 'edit-user' : 'add-user'

  if (!validate()) {
    return
  }

  isSavingChanges.value = true
  try {
    await ubusCall('ns.ovpnrw', requestType, {
      instance: props.instanceName,
      username: username.value,
      enabled: enabled.value ? '1' : '0',
      ipaddr: reservedIp.value,
      // include certificate expiration if user is being added
      ...(isEditing ? {} : { expiration: certificateExpiration.value })
    })
    isSavingChanges.value = false

    if (isEditing) {
      emit('edit-account')
    } else {
      emit('add-account')
    }

    close()
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationErrorBag.value = err.errorBag
    } else {
      error.value.notificationTitle = isEditing
        ? t('error.cannot_edit_account')
        : t('error.cannot_create_account')

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
      fetchOptions().then(() => {
        resetForm()
      })
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
        ? t('standalone.openvpn_rw.edit_vpn_account')
        : t('standalone.openvpn_rw.add_vpn_account')
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
    <NeSkeleton :lines="20" v-if="loading" />
    <div class="flex flex-col gap-y-6" v-else>
      <div>
        <NeFormItemLabel>{{ t('standalone.openvpn_rw.status') }}</NeFormItemLabel>
        <NeToggle v-model="enabled" :label="enabled ? t('common.enabled') : t('common.disabled')" />
      </div>
      <NeCombobox
        :label="t('standalone.openvpn_rw.user')"
        :disabled="Boolean(itemToEdit)"
        :options="usernameOptions"
        :no-options-label="t('ne_combobox.no_options_label')"
        :no-results-label="t('ne_combobox.no_results')"
        :optionalLabel="t('common.optional')"
        :placeholder="t('standalone.openvpn_rw.choose_user_from_database')"
        v-model="username"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('username'))"
      />
      <NeInlineNotification
        v-if="itemToEdit?.expired"
        kind="warning"
        :title="t('standalone.openvpn_rw.certificate_expired')"
        :description="t('standalone.openvpn_rw.certificate_expired_message')"
      />
      <NeTextInput
        v-model="reservedIp"
        :label="t('standalone.openvpn_rw.reserved_ip')"
        :helperText="
          t('standalone.openvpn_rw.reserved_ip_helper', {
            range: instanceData.ifconfig_pool
              ? `${instanceData.ifconfig_pool[0]}-${instanceData.ifconfig_pool[1]}`
              : ''
          })
        "
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('ipaddr'))"
        :optional="true"
        :optional-label="t('common.optional')"
      />
      <NeTextInput
        v-if="!itemToEdit"
        v-model="certificateExpiration"
        type="number"
        :label="t('standalone.openvpn_rw.certificate_expiration_days')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('expiration'))"
      />
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="createOrEditAccount()"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{
            Boolean(itemToEdit)
              ? t('standalone.openvpn_rw.edit_account')
              : t('standalone.openvpn_rw.add_account')
          }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
</template>
