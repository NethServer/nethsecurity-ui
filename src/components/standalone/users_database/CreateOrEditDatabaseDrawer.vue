<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  MessageBag,
  validateLDAPUri,
  validateRequired,
  validateUciName,
  type validationOutput
} from '@/lib/validation'
import type { UserDatabase } from '@/views/standalone/users_objects/UsersDatabaseView.vue'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeInlineNotification,
  NeButton,
  NeSideDrawer,
  NeTooltip,
  NeFormItemLabel,
  NeRadioSelection,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeToggle } from '@nethesis/vue-components'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'

type LDAPDatabasePayload = {
  name: string
  uri: string
  schema: string
  base_dn: string
  user_dn: string
  user_attr: string
  user_display_attr: string
  start_tls: string | boolean
  tls_reqcert: string
  description: string
  bind_dn: string
  bind_password: string
  user_bind_dn: string
}

const props = defineProps<{
  isShown: boolean
  itemToEdit?: UserDatabase
}>()

const { t } = useI18n()

const emit = defineEmits(['close', 'add-edit-database'])

const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const validationErrorBag = ref(new MessageBag())
const loading = ref(false)
const isTestingConfiguration = ref(false)
const testUserResults = ref<{ name: string; description: string }[] | null>(null)

// Form fields
const isEditing = ref(false)
const name = ref('')
const type = ref('rfc2307')
const ldapUri = ref('')
const baseDn = ref('')
const userDn = ref('')
const userDisplayAttr = ref('')
const userBindDn = ref('')
const userAttribute = ref('')
const startTls = ref(false)
const verifyTlsCertificate = ref(false)
const bindDn = ref('')
const bindPassword = ref('')

const typeOptions = [
  {
    id: 'rfc2307',
    label: t('standalone.users_database.remote_ldap')
  },
  { id: 'ad', label: t('standalone.users_database.remote_active_directory') }
]

async function resetForm() {
  testUserResults.value = null
  if (props.itemToEdit) {
    isEditing.value = true
    try {
      loading.value = true
      const databaseData: LDAPDatabasePayload = (
        await ubusCall('ns.users', 'get-database', {
          name: props.itemToEdit.name
        })
      ).data.database
      name.value = databaseData.name
      type.value = databaseData.schema
      ldapUri.value = databaseData.uri
      baseDn.value = databaseData.base_dn
      userDn.value = databaseData.user_dn
      userDisplayAttr.value = databaseData.user_display_attr
      userBindDn.value = databaseData.user_bind_dn
      userAttribute.value = databaseData.user_attr
      startTls.value = databaseData.start_tls === '1'
      verifyTlsCertificate.value = databaseData.tls_reqcert === 'always'
      bindDn.value = databaseData.bind_dn
      bindPassword.value = databaseData.bind_password

      loading.value = false
    } catch (err: any) {
      error.value.notificationTitle = t('error.cannot_retrieve_database_details')
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    }
  } else {
    isEditing.value = false
    name.value = ''
    type.value = 'rfc2307'
    ldapUri.value = ''
    baseDn.value = ''
    userDn.value = ''
    userDisplayAttr.value = ''
    userBindDn.value = ''
    userAttribute.value = ''
    startTls.value = false
    verifyTlsCertificate.value = false
    bindDn.value = ''
    bindPassword.value = ''
  }
}

function close() {
  if (!isTestingConfiguration.value) {
    validationErrorBag.value.clear()
    error.value.notificationTitle = ''
    error.value.notificationDescription = ''
    error.value.notificationDetails = ''
    emit('close')
  }
}

function runValidators(validators: validationOutput[], label: string): boolean {
  for (let validator of validators) {
    if (!validator.valid) {
      validationErrorBag.value.set(label, [validator.errMessage as string])
    }
  }

  return validators.every((validator) => validator.valid)
}

function validateUri(setErrorMessage: boolean) {
  let valid = true
  const requiredValidator = validateRequired(ldapUri.value)
  if (!requiredValidator.valid) {
    if (setErrorMessage) {
      validationErrorBag.value.set('uri', [requiredValidator.errMessage as string])
    }
    valid = false
  } else {
    const uriValidator = validateLDAPUri(ldapUri.value)
    if (!uriValidator.valid) {
      if (setErrorMessage) {
        validationErrorBag.value.set('uri', [uriValidator.errMessage as string])
      }
      valid = false
    }
  }

  return valid
}

function validate() {
  validationErrorBag.value.clear()

  const validators: [validationOutput[], string][] = [
    [[validateRequired(name.value), validateUciName(name.value)], 'name'],
    [[validateRequired(baseDn.value)], 'base_dn'],
    [[validateRequired(userDn.value)], 'user_dn'],
    [[validateRequired(userAttribute.value)], 'user_attr'],
    [[validateRequired(userDisplayAttr.value)], 'user_display_attr']
  ]

  const validateUriResult = validateUri(true)

  return (
    validators
      .map(([validator, label]) => runValidators(validator, label))
      .every((result) => result) && validateUriResult
  )
}

async function testDatabaseConfiguration() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  validationErrorBag.value.clear()

  try {
    if (validate()) {
      isTestingConfiguration.value = true
      const payload = {
        uri: ldapUri.value,
        schema: type.value,
        base_dn: baseDn.value,
        user_dn: userDn.value,
        user_attr: userAttribute.value,
        start_tls: startTls.value,
        user_display_attr: userDisplayAttr.value,
        description: '',
        tls_reqcert: verifyTlsCertificate.value ? 'always' : 'never',
        bind_dn: bindDn.value,
        bind_password: bindPassword.value
      }

      testUserResults.value = (await ubusCall('ns.users', 'test-ldap', payload)).data.users
    }
  } catch (err: any) {
    error.value.notificationTitle = t('error.database_test_failed')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    isTestingConfiguration.value = false
  }
}

async function createOrEditDatabase() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  validationErrorBag.value.clear()

  try {
    isSavingChanges.value = true
    const requestType = isEditing.value ? 'edit-ldap-database' : 'add-ldap-database'

    if (validate()) {
      let payload: LDAPDatabasePayload = {
        name: name.value,
        uri: ldapUri.value,
        schema: type.value,
        base_dn: baseDn.value,
        user_dn: userDn.value,
        user_attr: userAttribute.value,
        start_tls: startTls.value,
        user_display_attr: userDisplayAttr.value,
        description: '',
        tls_reqcert: verifyTlsCertificate.value ? 'always' : 'never',
        bind_dn: bindDn.value,
        bind_password: bindPassword.value,
        user_bind_dn: userBindDn.value
      }

      await ubusCall('ns.users', requestType, payload)
      emit('add-edit-database', name.value)
      close()
    }
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationErrorBag.value = err.errorBag
    } else {
      error.value.notificationTitle = isEditing.value
        ? t('error.cannot_edit_database')
        : t('error.cannot_create_database')
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
    :title="
      isEditing
        ? t('standalone.users_database.edit_remote_database')
        : t('standalone.users_database.add_remote_database')
    "
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
        v-model="name"
        :disabled="isEditing"
        :label="t('standalone.users_database.database_name')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('name'))"
      />
      <NeRadioSelection
        :label="t('standalone.users_database.type')"
        :options="typeOptions"
        v-model="type"
      />
      <NeTextInput
        v-model="ldapUri"
        :label="t('standalone.users_database.ldap_uri')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('uri'))"
        placeholder="ldaps://192.168.100.234"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.users_database.ldap_uri_tooltip') }}
            </template>
          </NeTooltip>
        </template>
      </NeTextInput>
      <NeTextInput
        v-model="baseDn"
        :label="t('standalone.users_database.base_dn')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('base_dn'))"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.users_database.base_dn_tooltip') }}
            </template>
          </NeTooltip>
        </template>
      </NeTextInput>
      <NeTextInput
        v-model="userDn"
        :label="t('standalone.users_database.user_dn')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('user_dn'))"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.users_database.user_dn_tooltip') }}
            </template>
          </NeTooltip>
        </template>
      </NeTextInput>
      <NeTextInput
        v-model="userAttribute"
        :label="t('standalone.users_database.user_attribute')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('user_attr'))"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.users_database.user_attribute_tooltip') }}
            </template>
          </NeTooltip>
        </template></NeTextInput
      >
      <NeTextInput
        v-model="userDisplayAttr"
        :label="t('standalone.users_database.user_display_attribute')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('user_display_attr'))"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.users_database.user_display_attribute_tooltip') }}
            </template>
          </NeTooltip>
        </template></NeTextInput
      >
      <NeTextInput
        v-model="userBindDn"
        :label="t('standalone.users_database.user_bind_dn')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('user_bind_dn'))"
        :optional="true"
        :optional-label="t('common.optional')"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.users_database.user_bind_dn_tooltip') }}
            </template>
          </NeTooltip>
        </template></NeTextInput
      >
      <NeTextInput
        v-model="bindDn"
        :label="t('standalone.users_database.bind_dn')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('bind_dn'))"
        :optional="true"
        :optional-label="t('common.optional')"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.users_database.bind_dn_tooltip') }}
            </template>
          </NeTooltip>
        </template></NeTextInput
      >
      <NeTextInput
        v-model="bindPassword"
        :label="t('standalone.users_database.bind_password')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('bind_password'))"
        :optional="true"
        :optional-label="t('common.optional')"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.users_database.bind_password_tooltip') }}
            </template>
          </NeTooltip>
        </template></NeTextInput
      >
      <div>
        <NeFormItemLabel>{{ t('standalone.users_database.starttls') }}</NeFormItemLabel>
        <NeToggle
          v-model="startTls"
          :label="startTls ? t('common.enabled') : t('common.disabled')"
        />
      </div>
      <div>
        <NeFormItemLabel>{{
          t('standalone.users_database.verify_tls_certificate')
        }}</NeFormItemLabel>
        <NeToggle
          v-model="verifyTlsCertificate"
          :label="verifyTlsCertificate ? t('common.enabled') : t('common.disabled')"
        />
      </div>
      <NeInlineNotification
        v-if="testUserResults"
        :title="t('standalone.users_database.connection_verified')"
        :description="t('standalone.users_database.n_users_found', { n: testUserResults.length })"
        class="mb-6"
        kind="info"
      />
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="secondary"
          class="mr-4"
          :disabled="isTestingConfiguration"
          :loading="isTestingConfiguration"
          @click="testDatabaseConfiguration()"
          >{{ t('standalone.users_database.test') }}</NeButton
        >
        <NeButton
          kind="primary"
          @click="createOrEditDatabase()"
          :disabled="isSavingChanges || isTestingConfiguration"
          :loading="isSavingChanges"
          >{{
            isEditing ? t('common.save') : t('standalone.users_database.add_database')
          }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
</template>
