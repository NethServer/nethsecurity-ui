<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeSkeleton,
  NeTitle,
  NeTooltip,
  NeBadge,
  NeButton,
  NeInlineNotification,
  focusElement,
  getAxiosErrorMessage,
  NeTextInput,
  NeTextArea
} from '@nethesis/vue-components'
import { NeToggle, NeModal } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'
import { MessageBag, validateRequired, type validationOutput } from '@/lib/validation'

type ControllerRegistrationStatus = {
  status: 'connected' | 'unregistered' | 'pending'
  address: string | null
  server: string | null
  unit_name: string
  unit_id: string
  tls_verify: boolean
}

const { t } = useI18n()

const loading = ref(false)
const isPerformingAction = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})

const disconnectUnitError = ref({
  notificationDescription: '',
  notificationDetails: ''
})

const status = ref<'connected' | 'unregistered' | 'pending'>('unregistered')
const statusFetchIntervalId = ref()

const showDisconnectUnitModal = ref(false)

// form fields
const unitId = ref('')
const unitName = ref('')
const controllerUrl = ref('')
const controllerJoinCode = ref('')
const verifyTlsCertificate = ref(false)
const vpnIpAddress = ref('')

// textinputs refs
const unitNameRef = ref()
const controllerJoinCodeRef = ref()

// contains the first invalid field ref
const firstErrorRef = ref()

const errorBag = ref(new MessageBag())

function clearError() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
}

async function fetchControllerRegistrationStatus(showLoadingSkeleton?: boolean) {
  if (showLoadingSkeleton) {
    loading.value = true
  }
  try {
    const registrationStatus = (await ubusCall('ns.plug', 'status'))
      .data as ControllerRegistrationStatus
    status.value = registrationStatus.status
    unitId.value = registrationStatus.unit_id
    controllerUrl.value = registrationStatus.server ?? ''
    unitName.value = registrationStatus.unit_name
    verifyTlsCertificate.value = registrationStatus.tls_verify
    vpnIpAddress.value = registrationStatus.address ?? ''
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_fetch_controller_registration_status')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    if (showLoadingSkeleton) {
      loading.value = false
    }
  }
}

async function startRegistrationStatusFetchInterval() {
  await fetchControllerRegistrationStatus(true)
  if (status.value !== 'unregistered') {
    statusFetchIntervalId.value = setInterval(() => {
      fetchControllerRegistrationStatus()
    }, 10000)
  }
}

function stopRegistrationStatusFetchInterval() {
  if (statusFetchIntervalId.value) {
    clearInterval(statusFetchIntervalId.value)
  }
}

function restartRegistrationStatusFetchInterval() {
  stopRegistrationStatusFetchInterval()
  startRegistrationStatusFetchInterval()
}

function runFieldValidators(
  validators: validationOutput[],
  fieldName: string,
  fieldRef: Ref<any>
): boolean {
  for (let validator of validators) {
    if (!validator.valid) {
      errorBag.value.set(fieldName, [validator.errMessage as string])

      // remember the first field with error for focus management
      if (!firstErrorRef.value) {
        firstErrorRef.value = fieldRef
      }
    }
  }
  return validators.every((validator) => validator.valid)
}

function validate() {
  errorBag.value.clear()

  const validators: [validationOutput[], string, Ref<any>][] = [
    [[validateRequired(unitName.value)], 'unit_name', unitNameRef],
    [[validateRequired(controllerJoinCode.value)], 'join_code', controllerJoinCodeRef]
  ]

  // reset firstErrorRef for focus management
  firstErrorRef.value = undefined

  const isValidationOk = validators
    .map(([validators, fieldName, fieldRef]) => runFieldValidators(validators, fieldName, fieldRef))
    .every((result) => result)

  if (firstErrorRef.value) {
    focusElement(firstErrorRef.value)
  }
  return isValidationOk
}

async function connectUnit() {
  clearError()

  if (!validate()) {
    return
  }
  isPerformingAction.value = true

  try {
    await ubusCall('ns.plug', 'register', {
      join_code: controllerJoinCode.value,
      tls_verify: verifyTlsCertificate.value,
      unit_name: unitName.value
    })
    restartRegistrationStatusFetchInterval()
  } catch (err: any) {
    if (err instanceof ValidationError) {
      errorBag.value = err.errorBag
    } else {
      error.value.notificationTitle = t('error.cannot_connect_unit')
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    }
  } finally {
    isPerformingAction.value = false
  }
}

async function disconnectUnit() {
  isPerformingAction.value = true
  clearError()
  try {
    await ubusCall('ns.plug', 'unregister')
    showDisconnectUnitModal.value = false
    restartRegistrationStatusFetchInterval()
  } catch (err: any) {
    disconnectUnitError.value.notificationDescription = t(getAxiosErrorMessage(err))
    disconnectUnitError.value.notificationDetails = err.toString()
  } finally {
    isPerformingAction.value = false
  }
}

async function restartConnection() {
  isPerformingAction.value = true
  clearError()
  try {
    await ubusCall('ns.plug', 'restart')
    restartRegistrationStatusFetchInterval()
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_restart_connection')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    isPerformingAction.value = false
  }
}

onMounted(() => {
  startRegistrationStatusFetchInterval()
})

onUnmounted(() => {
  stopRegistrationStatusFetchInterval()
})
</script>

<template>
  <div class="flex flex-col justify-between md:flex-row md:items-center">
    <NeTitle>{{ t('standalone.controller.title') }}</NeTitle>
    <div v-if="status !== 'unregistered'" class="mb-6 text-sm text-gray-500 dark:text-gray-400">
      {{ t('standalone.controller.data_updated_every_seconds', { seconds: 10 }) }}
    </div>
  </div>
  <div class="flex flex-col gap-y-6">
    <NeInlineNotification
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      v-if="error.notificationDescription"
    >
      <template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template>
    </NeInlineNotification>
    <FormLayout
      :title="t('standalone.controller.connect_unit')"
      :description="t('standalone.controller.connect_unit_description')"
      class="max-w-3xl"
    >
      <NeSkeleton :lines="10" v-if="loading"></NeSkeleton>
      <div class="flex flex-col gap-y-6" v-else>
        <NeTextInput
          v-model="unitName"
          :disabled="status !== 'unregistered'"
          :label="t('standalone.controller.unit_name')"
          ref="unitNameRef"
          :invalidMessage="t(errorBag.getFirstI18nKeyFor('unit_name'))"
        >
          <template #tooltip>
            <NeTooltip v-if="status === 'unregistered'">
              <template #content>
                {{ t('standalone.controller.unit_name_tooltip') }}
              </template>
            </NeTooltip>
          </template>
        </NeTextInput>
        <NeTextArea
          v-if="status === 'unregistered'"
          v-model="controllerJoinCode"
          :label="t('standalone.controller.controller_join_code')"
          ref="controllerJoinCodeRef"
          :invalidMessage="t(errorBag.getFirstI18nKeyFor('join_code'))"
        >
          <template #tooltip>
            <NeTooltip>
              <template #content>
                {{ t('standalone.controller.controller_join_code_tooltip') }}
              </template>
            </NeTooltip>
          </template>
        </NeTextArea>
        <template v-else
          ><NeTextInput
            v-model="unitId"
            :disabled="true"
            :label="t('standalone.controller.unit_id')"
          />
          <NeTextInput
            v-model="controllerUrl"
            :disabled="true"
            :label="t('standalone.controller.controller_url')"
          />
        </template>
        <NeTextInput
          v-if="status === 'connected'"
          v-model="vpnIpAddress"
          :disabled="true"
          :label="t('standalone.controller.vpn_ip_address')"
        />
        <NeToggle
          v-if="status === 'unregistered'"
          v-model="verifyTlsCertificate"
          :top-label="t('standalone.controller.verify_tls_certificate')"
          :label="verifyTlsCertificate ? t('common.enabled') : t('common.disabled')"
        />
        <div class="align-center flex flex-row" v-else>
          <NeTitle class="mr-4 inline-block" style="margin-bottom: 0" level="h4">{{
            t('common.status')
          }}</NeTitle>
          <NeBadge
            :text="
              status === 'pending'
                ? t('standalone.controller.pending')
                : t('standalone.controller.connected')
            "
            :kind="status === 'pending' ? 'warning' : 'success'"
            size="sm"
          />
        </div>
        <div v-if="status === 'unregistered'">
          <NeButton kind="primary" @click="connectUnit" :disabled="isPerformingAction">
            <template #prefix>
              <font-awesome-icon :icon="['fas', 'link']" class="h-4 w-4" aria-hidden="true" />
              {{ t('standalone.controller.connect_unit') }}
            </template>
          </NeButton>
        </div>
        <div class="-mx-2 flex flex-row gap-x-4" v-else>
          <NeButton
            kind="tertiary"
            @click="showDisconnectUnitModal = true"
            :disabled="isPerformingAction"
          >
            <template #prefix>
              <font-awesome-icon :icon="['fas', 'link-slash']" class="h-4 w-4" aria-hidden="true" />
              {{ t('standalone.controller.disconnect_unit') }}
            </template>
          </NeButton>
          <NeButton kind="secondary" @click="restartConnection" :disabled="isPerformingAction">
            <template #prefix>
              <font-awesome-icon
                :icon="['fas', 'arrows-rotate']"
                class="h-4 w-4"
                aria-hidden="true"
              />
              {{ t('standalone.controller.restart_connection') }}
            </template>
          </NeButton>
        </div>
      </div>
    </FormLayout>
  </div>
  <NeModal
    :primary-button-disabled="isPerformingAction"
    :primary-button-loading="isPerformingAction"
    :primary-label="t('standalone.controller.disconnect')"
    :title="t('standalone.controller.disconnect_unit')"
    :visible="showDisconnectUnitModal"
    kind="warning"
    primary-button-kind="danger"
    :close-aria-label="t('common.close')"
    @close="showDisconnectUnitModal = false"
    @primary-click="disconnectUnit"
  >
    {{ t('standalone.controller.disconnect_unit_message') }}
    <NeInlineNotification
      v-if="disconnectUnitError.notificationDescription"
      :title="t('error.cannot_connect_unit')"
      :description="disconnectUnitError.notificationDescription"
      kind="error"
    >
      <template #details v-if="disconnectUnitError.notificationDetails">
        {{ disconnectUnitError.notificationDetails }}
      </template>
    </NeInlineNotification>
  </NeModal>
</template>
