<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { Unit } from '@/stores/controller/units'
import { NeModal, NeTextInput } from '@nethserver/vue-tailwind-lib'
import { ref, watch, type PropType, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getSshKeys, type SshKey } from '@/lib/controller/sshKeys'
import { getXsrfToken, getWebsocketId, type SshConnectionPayload } from '@/lib/controller/webssh'
import {
  NeInlineNotification,
  NeSkeleton,
  focusElement,
  getAxiosErrorMessage,
  getPreference,
  savePreference
} from '@nethesis/vue-components'
import router from '@/router'
import { getUciConfigFromController } from '@/lib/standalone/ubus'
import { useLoginStore } from '@/stores/controller/controllerLogin'

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
const sshKeys = ref<SshKey>()
const xsrfToken = ref('')
const unitUsername = ref('root')
const unitPassword = ref('')
const unitSshPort = ref(22)
const websocketId = ref('')
const hideOpenSshPopupsTooltip = ref(false)
const unitUsernameRef = ref()
const unitPasswordRef = ref()

let loading = ref({
  getXsrfToken: false,
  getSshKeys: false,
  getWebsocketId: false,
  retrieveUnitSshPort: false
})

let error = ref({
  unitUsername: '',
  unitPassword: '',
  getXsrfToken: '',
  getSshKeys: '',
  getWebsocketId: '',
  retrieveUnitSshPort: '',
  authError: ''
})

const isLoading = computed(() => {
  return loading.value.getXsrfToken || loading.value.getSshKeys || loading.value.retrieveUnitSshPort
})

watch(
  () => props.visible,
  () => {
    if (props.visible) {
      clearErrors()
      unitPassword.value = ''
      retrieveSshKeys()
      retrieveXsrfToken()
      retrieveUnitSshPort()
    }
  }
)

watch(
  () => isLoading.value,
  () => {
    if (!isLoading.value) {
      focusElement(unitPasswordRef)
    }
  }
)

onMounted(() => {
  hideOpenSshPopupsTooltip.value = getPreference('hideOpenSshPopupsTooltip', loginStore.username)
})

function dontShowAgainHideOpenSshPopupsTooltip() {
  hideOpenSshPopupsTooltip.value = true
  savePreference('hideOpenSshPopupsTooltip', true, loginStore.username)
}

function clearErrors() {
  for (const key of Object.keys(error.value)) {
    error.value[key as keyof typeof error.value] = ''
  }
}

async function retrieveUnitSshPort() {
  loading.value.retrieveUnitSshPort = true

  try {
    const config = await getUciConfigFromController('dropbear', props.unit.id)
    unitSshPort.value = Number(config.dropbear[0].Port)
  } catch (err: any) {
    console.error(err)
    error.value.retrieveUnitSshPort = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.retrieveUnitSshPort = false
  }
}

async function retrieveSshKeys() {
  loading.value.getSshKeys = true

  try {
    sshKeys.value = await getSshKeys()
  } catch (err: any) {
    error.value.getSshKeys = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getSshKeys = false
  }
}

async function retrieveXsrfToken() {
  loading.value.getXsrfToken = true

  try {
    xsrfToken.value = await getXsrfToken()
  } catch (err: any) {
    error.value.getXsrfToken = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getXsrfToken = false
  }
}

function validateUsernameAndPassword() {
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
  return isValidationOk
}

async function retrieveWebsocketId() {
  const isValidationOk = validateUsernameAndPassword()

  if (!isValidationOk) {
    return
  }

  const sshPayload: SshConnectionPayload = {
    hostname: props.unit.ipaddress,
    port: unitSshPort.value,
    username: unitUsername.value,
    password: unitPassword.value,
    passphrase: '', //// TODO
    totp: '',
    term: 'xterm-256color',
    _xsrf: xsrfToken.value
  }
  loading.value.getWebsocketId = true

  try {
    websocketId.value = await getWebsocketId(sshPayload)
  } catch (err: any) {
    if (err.response?.status === 401) {
      error.value.authError = t('controller.units.auth_error')
      focusElement(unitPasswordRef)
    } else {
      error.value.getWebsocketId = t(getAxiosErrorMessage(err))
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
    :primaryLabel="t('controller.units.open_terminal')"
    :cancelLabel="t('common.cancel')"
    primaryButtonKind="primary"
    :primaryButtonLoading="loading.getWebsocketId"
    :primaryButtonDisabled="isLoading"
    :closeAriaLabel="t('common.close')"
    @close="emit('close')"
    @primaryClick="retrieveWebsocketId"
  >
    <div class="space-y-6">
      <NeInlineNotification
        v-if="!hideOpenSshPopupsTooltip"
        kind="info"
        :title="t('controller.units.popup_permission_title')"
        :description="t('controller.units.popup_permission_description')"
        :secondaryButtonLabel="t('common.dont_show_again')"
        @secondaryClick="dontShowAgainHideOpenSshPopupsTooltip"
        :closeAriaLabel="t('common.close')"
      />
      <!-- getXsrfToken error modal -->
      <NeInlineNotification
        v-if="error.getXsrfToken"
        kind="error"
        :title="t('error.cannot_retrieve_xsrf_token')"
        :description="error.getXsrfToken"
        :closeAriaLabel="t('common.close')"
      />
      <!-- getSshKeys error modal -->
      <NeInlineNotification
        v-if="error.getSshKeys"
        kind="error"
        :title="t('error.cannot_retrieve_ssh_keys')"
        :description="error.getSshKeys"
        :closeAriaLabel="t('common.close')"
      />
      <!-- getWebsocketId error modal -->
      <NeInlineNotification
        v-if="error.getWebsocketId"
        kind="error"
        :title="t('error.cannot_retrieve_websocket_id')"
        :description="error.getWebsocketId"
        :closeAriaLabel="t('common.close')"
      />
      <!-- retrieveUnitSshPort error modal -->
      <NeInlineNotification
        v-if="error.retrieveUnitSshPort"
        kind="error"
        :title="t('error.cannot_retrieve_unit_ssh_port')"
        :description="error.retrieveUnitSshPort"
        :closeAriaLabel="t('common.close')"
      />
      <!-- authentication error (from getWebsocketId) modal -->
      <NeInlineNotification
        v-if="error.authError"
        kind="error"
        :title="t('controller.units.auth_error')"
        :description="t('controller.units.auth_error_description')"
        :closeAriaLabel="t('common.close')"
      />
      <!-- skeleton -->
      <NeSkeleton v-if="isLoading" size="lg" :lines="4" />
      <template v-else>
        <!-- unit username -->
        <NeTextInput
          :label="t('controller.units.unit_username')"
          v-model.trim="unitUsername"
          :invalidMessage="t(error.unitUsername)"
          autocomplete="username"
          ref="unitUsernameRef"
        />
        <!-- unit password -->
        <NeTextInput
          :label="t('controller.units.unit_password')"
          v-model="unitPassword"
          isPassword
          :showPasswordLabel="t('ne_text_input.show_password')"
          :hidePasswordLabel="t('ne_text_input.hide_password')"
          :invalidMessage="t(error.unitPassword)"
          autocomplete="current-password"
          ref="unitPasswordRef"
        />
      </template>
    </div>
  </NeModal>
</template>
