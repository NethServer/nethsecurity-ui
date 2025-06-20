<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { Unit } from '@/stores/controller/units'
import { NeModal } from '@nethesis/vue-components'
import { ref, watch, type PropType, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getXsrfToken, getWebsocketId, type SshConnectionPayload } from '@/lib/controller/webssh'
import {
  NeInlineNotification,
  NeSkeleton,
  NeTooltip,
  NeTextInput,
  focusElement,
  getAxiosErrorMessage,
  getPreference,
  savePreference
} from '@nethesis/vue-components'
import router from '@/router'
import { useLoginStore } from '@/stores/controller/controllerLogin'
import { ubusCallFromController } from '@/lib/standalone/ubus'
import { useAccountsStore } from '@/stores/controller/accounts'
import type { SshKey } from '@/lib/standalone/sshKey'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  unit: {
    type: Object as PropType<Unit>,
    default: null
  }
})

const emit = defineEmits(['close'])

const { t } = useI18n()
const loginStore = useLoginStore()
const accountsStore = useAccountsStore()
const xsrfToken = ref('')
const unitUsername = ref('root')
const unitPassword = ref('')
const websocketId = ref('')
const hideOpenSshPopupsTooltip = ref(false)
const unitUsernameRef = ref()
const unitPasswordRef = ref()
const usePassphrase = ref(false)
const passphrase = ref('')
const passphraseRef = ref()

const loading = ref({
  getXsrfToken: false,
  getWebsocketId: false,
  sshKeys: false
})

const error = ref({
  unitUsername: '',
  unitPassword: '',
  passphrase: '',
  getXsrfToken: '',
  getXsrfTokenDetails: '',
  getWebsocketId: '',
  getWebsocketIdDetails: '',
  authError: '',
  getUnitSshKeys: '',
  getUnitSshKeysDetails: ''
})

const isLoading = computed(() => {
  return loading.value.getXsrfToken || loading.value.sshKeys
})

watch(
  () => props.visible,
  () => {
    if (props.visible) {
      clearErrors()
      unitUsername.value = 'root'
      unitPassword.value = ''
      passphrase.value = ''
      retrieveXsrfToken()
      loadAccountAndUnitSshKeys()
    }
  }
)

watch(
  () => isLoading.value,
  () => {
    if (!isLoading.value) {
      if (usePassphrase.value) {
        focusElement(passphraseRef)
      } else {
        focusElement(unitPasswordRef)
      }
    }
  }
)

onMounted(() => {
  hideOpenSshPopupsTooltip.value = getPreference('hideOpenSshPopupsTooltip', loginStore.username)
})

async function loadAccountAndUnitSshKeys() {
  loading.value.sshKeys = true

  try {
    await accountsStore.loadSshKeys()
    const pubKey = accountsStore.sshKeys.key_pub

    if (!pubKey) {
      usePassphrase.value = false
      loading.value.sshKeys = false
      return
    }

    try {
      const res = await ubusCallFromController('ns.ssh', 'list-keys', {}, props.unit.id)
      const keys: SshKey[] = res.data.keys
      const tokens = pubKey.split(' ')
      const pubKeyType = tokens[0]
      const pubKeyKey = tokens[1]
      const pubKeyComment = tokens.slice(2).join(' ')

      const pubKeyFound = keys.find(
        (key) =>
          key.key.trim() === pubKeyKey.trim() &&
          key.type === pubKeyType &&
          key.comment === pubKeyComment
      )

      if (pubKeyFound) {
        usePassphrase.value = true
      } else {
        usePassphrase.value = false
      }
    } catch (err: any) {
      error.value.getUnitSshKeys = t(getAxiosErrorMessage(err))
      error.value.getUnitSshKeysDetails = err.toString()
    }
  } finally {
    loading.value.sshKeys = false
  }
}

function dontShowAgainHideOpenSshPopupsTooltip() {
  hideOpenSshPopupsTooltip.value = true
  savePreference('hideOpenSshPopupsTooltip', true, loginStore.username)
}

function clearErrors() {
  for (const key of Object.keys(error.value)) {
    error.value[key as keyof typeof error.value] = ''
  }
}

async function retrieveXsrfToken() {
  loading.value.getXsrfToken = true

  try {
    xsrfToken.value = await getXsrfToken()
  } catch (err: any) {
    error.value.getXsrfToken = t(getAxiosErrorMessage(err))
    error.value.getXsrfTokenDetails = err.toString()
  } finally {
    loading.value.getXsrfToken = false
  }
}

function validateCredentials() {
  clearErrors()
  let isValidationOk = true

  // username
  {
    if (!unitUsername.value) {
      error.value.unitUsername = t('error.required')
      if (isValidationOk) {
        isValidationOk = false
        focusElement(unitUsernameRef)
      }
    }
  }

  if (usePassphrase.value) {
    // passphrase
    {
      if (!passphrase.value) {
        error.value.passphrase = t('error.required')
        if (isValidationOk) {
          isValidationOk = false
          focusElement(passphraseRef)
        }
      }
    }
  } else {
    // password
    {
      if (!unitPassword.value) {
        error.value.unitPassword = t('error.required')
        if (isValidationOk) {
          isValidationOk = false
          focusElement(unitPasswordRef)
        }
      }
    }
  }
  return isValidationOk
}

async function retrieveWebsocketId() {
  const isValidationOk = validateCredentials()

  if (!isValidationOk) {
    return
  }

  const sshPayload: SshConnectionPayload = {
    hostname: props.unit.ipaddress,
    port: props.unit.info.ssh_port,
    username: unitUsername.value,
    password: usePassphrase.value ? '' : unitPassword.value,
    passphrase: usePassphrase.value ? passphrase.value : '',
    privatekey: usePassphrase.value ? accountsStore.sshKeys.key : '',
    totp: '',
    term: 'xterm-256color',
    _xsrf: xsrfToken.value
  }
  loading.value.getWebsocketId = true
  websocketId.value = ''

  try {
    websocketId.value = await getWebsocketId(sshPayload)
  } catch (err: any) {
    if (err.response?.status === 401) {
      error.value.authError = usePassphrase.value
        ? t('controller.units.auth_error_passphrase')
        : t('controller.units.auth_error_credentials')

      if (usePassphrase.value) {
        focusElement(passphraseRef)
      } else {
        focusElement(unitPasswordRef)
      }
    } else {
      error.value.getWebsocketId = t(getAxiosErrorMessage(err))
      error.value.getWebsocketIdDetails = err.toString()
    }
  } finally {
    loading.value.getWebsocketId = false
  }

  if (websocketId.value) {
    const unitName = props.unit?.info?.unit_name || props.unit?.id
    const routeData = router.resolve({
      path: '/controller/unit-terminal',
      query: { websocketId: websocketId.value, unitName: unitName }
    })
    window.open(routeData.href, '_blank')
    emit('close')
  }
}
</script>

<template>
  <NeModal
    :visible="visible"
    :title="t('controller.units.open_ssh_terminal')"
    kind="info"
    :primary-label="t('controller.units.open_terminal')"
    :cancel-label="t('common.cancel')"
    primary-button-kind="primary"
    :primary-button-loading="loading.getWebsocketId"
    :primary-button-disabled="isLoading"
    :close-aria-label="t('common.close')"
    @close="emit('close')"
    @primary-click="retrieveWebsocketId"
  >
    <div class="space-y-6">
      <NeInlineNotification
        v-if="!hideOpenSshPopupsTooltip"
        kind="info"
        :title="t('controller.units.popup_permission_title')"
        :description="t('controller.units.popup_permission_description')"
        :primary-button-label="t('common.dont_show_again')"
        :close-aria-label="t('common.close')"
        @primary-click="dontShowAgainHideOpenSshPopupsTooltip"
      />
      <!-- getXsrfToken error notification -->
      <NeInlineNotification
        v-if="error.getXsrfToken"
        kind="error"
        :title="t('error.cannot_retrieve_xsrf_token')"
        :description="error.getXsrfToken"
        :close-aria-label="t('common.close')"
      >
        <template v-if="error.getXsrfTokenDetails" #details>
          {{ error.getXsrfTokenDetails }}
        </template>
      </NeInlineNotification>
      <!-- getWebsocketId error notification -->
      <NeInlineNotification
        v-if="error.getWebsocketId"
        kind="error"
        :title="t('error.cannot_retrieve_websocket_id')"
        :description="error.getWebsocketId"
        :close-aria-label="t('common.close')"
      >
        <template v-if="error.getWebsocketIdDetails" #details>
          {{ error.getWebsocketIdDetails }}
        </template>
      </NeInlineNotification>
      <!-- listSshKeys error notification -->
      <NeInlineNotification
        v-if="accountsStore.listSshKeysError.notificationDescription"
        kind="error"
        :title="t('error.cannot_retrieve_ssh_keys')"
        :description="accountsStore.listSshKeysError.notificationDescription"
        :close-aria-label="t('common.close')"
      >
        <template v-if="accountsStore.listSshKeysError.notificationDetails" #details>
          {{ accountsStore.listSshKeysError.notificationDetails }}
        </template>
      </NeInlineNotification>
      <!-- getUnitSshKeys error notification -->
      <NeInlineNotification
        v-if="error.getUnitSshKeys"
        kind="error"
        :title="t('error.cannot_retrieve_unit_ssh_keys')"
        :description="error.getUnitSshKeys"
        :close-aria-label="t('common.close')"
      >
        <template v-if="error.getUnitSshKeysDetails" #details>
          {{ error.getUnitSshKeysDetails }}
        </template>
      </NeInlineNotification>
      <!-- authentication error (from getWebsocketId) notification -->
      <NeInlineNotification
        v-if="error.authError"
        kind="error"
        :title="t('controller.units.auth_error')"
        :description="error.authError"
        :close-aria-label="t('common.close')"
      />
      <!-- skeleton -->
      <NeSkeleton v-if="isLoading" size="lg" :lines="4" />
      <template v-else>
        <!-- unit username -->
        <NeTextInput
          ref="unitUsernameRef"
          v-model.trim="unitUsername"
          :label="t('controller.units.unit_username')"
          :invalid-message="t(error.unitUsername)"
          autocomplete="username"
        />
        <template v-if="usePassphrase">
          <!-- passphrase -->
          <NeTextInput
            ref="passphraseRef"
            v-model.trim="passphrase"
            :label="t('controller.units.passphrase')"
            :invalid-message="t(error.passphrase)"
            is-password
            :show-password-label="t('ne_text_input.show_password')"
            :hide-password-label="t('ne_text_input.hide_password')"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('controller.units.passphrase_tooltip') }}
                </template>
              </NeTooltip>
            </template>
          </NeTextInput>
        </template>
        <template v-else>
          <!-- unit password -->
          <NeTextInput
            ref="unitPasswordRef"
            v-model="unitPassword"
            :label="t('controller.units.unit_password')"
            is-password
            :show-password-label="t('ne_text_input.show_password')"
            :hide-password-label="t('ne_text_input.hide_password')"
            :invalid-message="t(error.unitPassword)"
            autocomplete="current-password"
          />
        </template>
      </template>
    </div>
  </NeModal>
</template>
