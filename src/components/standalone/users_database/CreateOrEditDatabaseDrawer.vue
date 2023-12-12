<script setup lang="ts">
import { MessageBag, validateRequired, type validationOutput } from '@/lib/validation'
import type { UserDatabase } from '@/views/standalone/vpn/UsersDatabaseView.vue'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeTextInput,
  NeSideDrawer,
  NeInlineNotification,
  NeToggle,
  NeFormItemLabel,
  NeRadioSelection,
  NeTooltip,
  getAxiosErrorMessage
} from '@nethserver/vue-tailwind-lib'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'

const props = defineProps<{
  isShown: boolean
  itemToEdit: UserDatabase | null
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

// Form fields
const id = ref('')
const name = ref('')
const type = ref('rfc2307')
const ldapUri = ref('')
const baseDn = ref('')
const userDn = ref('')
const userCn = ref('')
const userAttribute = ref('')
const startTls = ref(false)
const verifyTlsCertificate = ref(false)

const typeOptions = [
  {
    id: 'rfc2307',
    label: t('standalone.users_database.remote_ldap')
  },
  { id: 'ad', label: t('standalone.users_database.remote_active_directory') }
]

function resetForm() {
  if (props.itemToEdit) {
    //TODO: populate fields
  } else {
    id.value = ''
    name.value = ''
    type.value = 'rfc2307'
    ldapUri.value = ''
    baseDn.value = ''
    userDn.value = ''
    userCn.value = ''
    userAttribute.value = ''
    startTls.value = false
    verifyTlsCertificate.value = false
  }
}

function close() {
  validationErrorBag.value.clear()
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  emit('close')
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

  const validators: [validationOutput[], string][] = [
    [[validateRequired(name.value)], 'name'],
    [[validateRequired(ldapUri.value)], 'uri'],
    [[validateRequired(baseDn.value)], 'base_dn'],
    [[validateRequired(userDn.value)], 'user_dn'],
    [[validateRequired(userAttribute.value)], 'user_attr'],
    [[validateRequired(userCn.value)], 'user_cn']
  ]

  return validators
    .map(([validator, label]) => runValidators(validator, label))
    .every((result) => result)
}

async function testDatabaseConfiguration() {
  //TODO: add test database functionality
}

async function createOrEditDatabase() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  validationErrorBag.value.clear()

  const isEditing = id.value != ''

  try {
    isSavingChanges.value = true
    const requestType = isEditing ? 'edit-ldap-database' : 'add-ldap-database'

    if (validate()) {
      let payload: {
        name: string
        uri: string
        schema: string
        base_dn: string
        user_dn: string
        user_attr: string
        user_cn: string
        start_tls: boolean
        tls_reqcert: string
        description: string
      } = {
        name: name.value,
        uri: ldapUri.value,
        schema: type.value,
        base_dn: baseDn.value,
        user_dn: userDn.value,
        user_attr: userAttribute.value,
        start_tls: startTls.value,
        user_cn: 'cn',
        description: '',
        tls_reqcert: verifyTlsCertificate.value ? 'always' : 'never'
      }

      //TODO: handle edit case

      await ubusCall('ns.users', requestType, payload)
      emit('add-edit-database')
      close()
    }
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationErrorBag.value = err.errorBag
    } else {
      error.value.notificationTitle = isEditing
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
    if (props.isShown) resetForm()
  }
)
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="close()"
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
    :title="
      id
        ? t('standalone.users_database.edit_database')
        : t('standalone.users_database.add_database')
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
        v-model="userCn"
        :label="t('standalone.users_database.user_cn')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('user_cn'))"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.users_database.user_cn_tooltip') }}
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
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton kind="secondary" class="mr-4" @click="testDatabaseConfiguration()">{{
          t('standalone.users_database.test')
        }}</NeButton>
        <NeButton
          kind="primary"
          @click="createOrEditDatabase()"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{ id ? t('common.save') : t('standalone.users_database.add_database') }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
</template>
