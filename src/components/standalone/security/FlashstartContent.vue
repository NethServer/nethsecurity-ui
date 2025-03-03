<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import FormLayout from '@/components/standalone/FormLayout.vue'
import {
  NeCombobox,
  type NeComboboxOption,
  NeLink,
  NeInlineNotification,
  NeSkeleton,
  NeTooltip,
  NeButton,
  NeFormItemLabel,
  NeTextInput,
  focusElement,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeToggle } from '@nethesis/vue-components'
import NeMultiTextInput from '@/components/standalone/NeMultiTextInput.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  validateIp4Address,
  validateIp4Cidr,
  validateRequired,
  validateRequiredOption
} from '@/lib/validation'
import { ubusCall } from '@/lib/standalone/ubus'
import { AxiosError } from 'axios'
import { useNotificationsStore } from '@/stores/notifications'

const { t } = useI18n()
const notificationsStore = useNotificationsStore()

const form = ref({
  status: false,
  username: '',
  password: '',
  bypassSource: [''],
  zones: []
})

const isError = ref(false)
const loading = ref(false)
const saving = ref(false)
const zones = ref<NeComboboxOption[]>([])
const usernameRef = ref()
const passwordRef = ref()
const zonesRef = ref()
const bypassSourceRef = ref()

const objError = {
  notificationTitle: '',
  notificationDescription: '',
  username: '',
  password: '',
  zones: '',
  bypassSource: ['']
}
const error = ref({ ...objError })
const errorLoadingZones = ref({ ...objError })
const errorLoadingConfiguration = ref({ ...objError })
const errorSaving = ref({ ...objError })

onMounted(() => {
  getConfiguration()
})

async function getZones() {
  errorLoadingZones.value = { ...objError }

  // Retrieve firewall zones
  try {
    const getZones = await ubusCall('ns.flashstart', 'list-zones', {})
    if (getZones?.data?.values?.length) {
      zones.value = getZones.data.values.map((item: any) => ({
        id: item.label,
        label: item.label
      }))
    }
  } catch (exception: any) {
    isError.value = true
    errorLoadingZones.value.notificationTitle = t('error.cannot_retrieve_zones')
    errorLoadingZones.value.notificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    loading.value = false
  }
}

async function getConfiguration() {
  loading.value = true

  try {
    const getDataConfiguration = await ubusCall('ns.flashstart', 'get-config', {})
    if (getDataConfiguration && getDataConfiguration.data && getDataConfiguration.data.values) {
      const configuration = getDataConfiguration.data.values
      form.value.status = configuration.enabled
      form.value.username = configuration.username
      form.value.password = configuration.password
      form.value.bypassSource = configuration.bypass
      form.value.zones = configuration.zones.map((item: any) => ({
        id: item,
        label: item
      }))

      if (!form.value.bypassSource.length) {
        form.value.bypassSource = ['']
      }
    }
  } catch (exception: any) {
    isError.value = true
    errorLoadingConfiguration.value.notificationTitle = t(
      'error.cannot_retrieve_flashstart_configuration'
    )
    errorLoadingConfiguration.value.notificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    await getZones()
  }
}

function clearErrors() {
  error.value = {
    notificationTitle: '',
    notificationDescription: '',
    username: '',
    password: '',
    zones: '',
    bypassSource: ['']
  }
}

function validate() {
  let isValidationOk = true
  let isFocusInput = false

  if (!form.value.username) {
    const { valid, errMessage } = validateRequired(form.value.username)
    if (!valid) {
      error.value.username = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk) {
    focusElement(usernameRef)
    isFocusInput = true
  }

  if (!form.value.password) {
    const { valid, errMessage } = validateRequired(form.value.password)
    if (!valid) {
      error.value.password = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk && !isFocusInput) {
    focusElement(passwordRef)
    isFocusInput = true
  }

  if (!form.value.zones.length) {
    const { valid, errMessage } = validateRequiredOption(form.value.zones)
    if (!valid) {
      error.value.zones = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk && !isFocusInput) {
    focusElement(zonesRef)
  }

  for (const [index, item] of form.value.bypassSource.entries()) {
    if (item) {
      const validator = [validateIp4Address(item), validateIp4Cidr(item)]
      const allInvalid = validator.every((obj) => !obj.valid)
      if (allInvalid) {
        error.value.bypassSource[index] = t(validator[0].errMessage as string)
        isValidationOk = false
      }
    }
  }

  return isValidationOk
}

function save() {
  clearErrors()
  if (!form.value.status || validate()) {
    saving.value = true

    // create payload
    const payload = {
      enabled: form.value.status,
      username: form.value.username,
      password: form.value.password,
      zones: form.value.zones
        .filter((zone: NeComboboxOption) => zone.label)
        .map((zone: NeComboboxOption) => zone.label),
      bypass: form.value.bypassSource.filter((item) => item)
    }

    ubusCall('ns.flashstart', 'set-config', payload)
      .then(() => {
        notificationsStore.createNotification({
          kind: 'success',
          title: t('standalone.flashstart.flashstart_configuration_saved')
        })
      })
      .catch((exception: AxiosError) => {
        errorSaving.value.notificationTitle = t('error.cannot_save_configuration')
        errorSaving.value.notificationDescription = t(getAxiosErrorMessage(exception))
      })
      .finally(() => (saving.value = false))
  }
}
</script>

<template>
  <div>
    <FormLayout :title="t('standalone.flashstart.content_title')" class="max-w-3xl">
      <template #description>
        <i18n-t keypath="standalone.flashstart.content_description" tag="p" scope="global">
          <template #createAccount>
            <NeLink href="https://flashstart.nethesis.it/" target="_blank">
              {{ t('standalone.flashstart.content_link') }}
            </NeLink>
          </template>
        </i18n-t>
      </template>
      <NeSkeleton v-if="loading" :lines="5" />
      <NeInlineNotification
        v-if="errorLoadingZones.notificationTitle"
        class="my-4"
        kind="error"
        :title="errorLoadingZones.notificationTitle"
        :description="errorLoadingZones.notificationDescription"
      />
      <NeInlineNotification
        v-if="errorLoadingConfiguration.notificationTitle"
        class="my-4"
        kind="error"
        :title="errorLoadingConfiguration.notificationTitle"
        :description="errorLoadingConfiguration.notificationDescription"
      />
      <div v-if="!isError && !loading" class="mb-8 flex flex-col gap-y-6">
        <div>
          <NeFormItemLabel>{{ t('standalone.flashstart.status') }}</NeFormItemLabel>
          <NeToggle
            v-model="form.status"
            :label="
              form.status
                ? t('standalone.flashstart.status_enabled')
                : t('standalone.flashstart.status_disabled')
            "
          />
        </div>
        <template v-if="form.status">
          <NeTextInput
            ref="usernameRef"
            v-model="form.username"
            :invalid-message="error.username"
            :label="t('standalone.flashstart.username')"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  <i18n-t keypath="standalone.flashstart.username_helper" tag="span" scope="global">
                    <template #flashstartUrl>
                      <NeLink inverted-theme href="https://flashstart.nethesis.it/" target="_blank">
                        https://flashstart.nethesis.it/
                      </NeLink>
                    </template>
                  </i18n-t>
                </template>
              </NeTooltip>
            </template>
          </NeTextInput>
          <NeTextInput
            ref="passwordRef"
            v-model="form.password"
            is-password
            :invalid-message="error.password"
            :label="t('standalone.flashstart.password')"
          />
          <NeCombobox
            ref="zonesRef"
            v-model="form.zones"
            :label="t('standalone.flashstart.zones')"
            :placeholder="t('standalone.flashstart.zones_placeholder')"
            multiple
            :options="zones"
            :invalid-message="error.zones"
            :no-results-label="t('ne_combobox.no_results')"
            :limited-options-label="t('ne_combobox.limited_options_label')"
            :no-options-label="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            :optional-label="t('common.optional')"
          />
          <NeMultiTextInput
            ref="bypassSourceRef"
            v-model="form.bypassSource"
            :title="t('standalone.flashstart.sourcebypass')"
            :add-item-label="t('standalone.flashstart.add_sourcebypass')"
            :invalid-messages="error.bypassSource"
            :disable-inputs="saving"
            :disable-add-button="saving"
            optional
            :optional-label="t('common.optional')"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.flashstart.sourcebypass_helper') }}
                </template>
              </NeTooltip>
            </template>
          </NeMultiTextInput>
          <NeInlineNotification
            v-if="errorSaving.notificationTitle"
            class="my-4"
            kind="error"
            :title="errorSaving.notificationTitle"
            :description="errorSaving.notificationDescription"
          />
        </template>
        <div class="mt-6">
          <NeButton :disabled="saving" :kind="'primary'" :loading="saving" @click="save()">
            <template #prefix>
              <FontAwesomeIcon :icon="['fas', 'floppy-disk']" class="h-4 w-4" aria-hidden="true" />
            </template>
            {{ t('common.save') }}
          </NeButton>
        </div>
      </div>
    </FormLayout>
  </div>
</template>
