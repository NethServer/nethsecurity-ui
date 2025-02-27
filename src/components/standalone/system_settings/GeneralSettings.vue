<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getUciConfig, ubusCall } from '@/lib/standalone/ubus'
import { validateHostname, validateRequired } from '@/lib/validation'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import {
  NeCombobox,
  NeButton,
  NeSkeleton,
  NeInlineNotification,
  NeFormItemLabel,
  focusElement,
  formatInTimeZoneLoc,
  getAxiosErrorMessage,
  NeTextInput,
  NeTextArea
} from '@nethesis/vue-components'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

const hostname = ref('')
const hostnameRef = ref()
const description = ref('')
const notes = ref('')
const localTime: any = ref(null)
const timezone = ref('')
const timezoneRef = ref()
const timezones = ref([])
const systemConfig: any = ref({})
const hostnameFromConfig = ref('')

const loading = ref({
  systemConfig: true,
  systemInfo: true,
  timezones: true,
  syncWithBrowser: false,
  syncWithNtpServer: false,
  save: false
})

const error = ref({
  hostname: '',
  timezone: '',
  notificationTitle: '',
  notificationDescription: ''
})

const isLoading = computed(() => {
  return loading.value.systemConfig || loading.value.systemInfo || loading.value.timezones
})

watch(
  () => loading.value.systemConfig,
  () => {
    if (!loading.value.systemConfig && !loading.value.timezones) {
      // set timezone in combobox
      timezone.value = systemConfig.value.system[0].zonename
    }
  }
)

watch(
  () => loading.value.timezones,
  () => {
    if (!loading.value.systemConfig && !loading.value.timezones) {
      // set timezone in combobox
      timezone.value = systemConfig.value.system[0].zonename
    }
  }
)

onMounted(() => {
  loadData()
})

async function loadData() {
  getSystemConfig()
  getSystemInfo()
  getTimezones()
}

async function getSystemInfo() {
  loading.value.systemInfo = true

  try {
    const res = await ubusCall('system', 'info')
    localTime.value = new Date(res.data.localtime * 1000)
    loading.value.systemInfo = true
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_system_info')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  loading.value.systemInfo = false
}

async function getSystemConfig() {
  loading.value.systemConfig = true

  try {
    const config = await getUciConfig('system')
    systemConfig.value = config
    hostname.value = config.system[0].hostname
    hostnameFromConfig.value = hostname.value
    description.value = config.system[0].description
    notes.value = config.system[0].notes
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_system_config')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  loading.value.systemConfig = false
}

async function getTimezones() {
  loading.value.timezones = true

  try {
    const res = await ubusCall('luci', 'getTimezones')
    const tzList: any = [{ id: 'UTC', label: 'UTC', timezone: '' }]

    for (const [key, value] of Object.entries(res.data) as [string, any][]) {
      tzList.push({ id: key, label: key, timezone: value.tzstring })
    }
    timezones.value = tzList
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_timezones')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  loading.value.timezones = false
}

function validate() {
  // reset errors
  error.value.hostname = ''
  error.value.timezone = ''
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''

  let isValidationOk = true

  // hostname

  {
    // check required
    const { valid, errMessage } = validateRequired(hostname.value)
    if (!valid) {
      error.value.hostname = t(errMessage as string)
      isValidationOk = false
      focusElement(hostnameRef)
    } else {
      {
        // check syntax
        const { valid, errMessage } = validateHostname(hostname.value)
        if (!valid) {
          error.value.hostname = t(errMessage as string)
          isValidationOk = false
          focusElement(hostnameRef)
        }
      }
    }
  }
  return isValidationOk
}

async function setSystemConfig() {
  const timezoneFound: any = timezones.value.find((tz: any) => tz.id === timezone.value)

  await ubusCall('uci', 'set', {
    config: 'system',
    section: '@system[0]',
    values: {
      hostname: hostname.value,
      description: description.value,
      notes: notes.value,
      zonename: timezone.value,
      timezone: timezoneFound.timezone
    }
  })
}

async function enableSysntpd() {
  await ubusCall('luci', 'setInitAction', {
    name: 'sysntpd',
    action: 'enable'
  })
}

async function save() {
  const isValidationOk = validate()

  if (!isValidationOk) {
    return
  }
  loading.value.save = true

  try {
    await setSystemConfig()
    await enableSysntpd()
    loadData()
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_save_configuration')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.save = false
    await uciChangesStore.getChanges()
  }
}

async function syncWithNtpServer() {
  loading.value.syncWithNtpServer = true

  try {
    await ubusCall('luci', 'setInitAction', {
      name: 'sysntpd',
      action: 'restart'
    })
    getSystemInfo()
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_sync_local_time')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  loading.value.syncWithNtpServer = false
}
</script>

<template>
  <div class="max-w-xl">
    <NeInlineNotification
      v-if="error.notificationTitle"
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-4"
    />
    <NeSkeleton v-if="isLoading" size="lg" :lines="12" />
    <div v-else>
      <!-- main section -->
      <div class="border-b border-gray-200 pb-6 dark:border-gray-700">
        <div class="space-y-6">
          <NeInlineNotification
            v-if="hostnameFromConfig === 'NethSec'"
            kind="warning"
            :title="t('standalone.system_settings.default_hostname')"
            :description="t('standalone.system_settings.default_hostname_description')"
            :close-aria-label="t('common.close')"
          />
          <!-- hostname -->
          <NeTextInput
            ref="hostnameRef"
            v-model.trim="hostname"
            :label="t('standalone.system_settings.hostname')"
            :invalid-message="error.hostname"
            :disabled="loading.save"
          />
          <!-- description -->
          <NeTextInput
            v-model.trim="description"
            :label="t('standalone.system_settings.short_description')"
            :placeholder="t('standalone.system_settings.short_description_placeholder')"
            optional
            :optional-label="t('common.optional')"
            :disabled="loading.save"
          />
          <!-- notes -->
          <NeTextArea
            v-model.trim="notes"
            :label="t('standalone.system_settings.notes')"
            :placeholder="t('standalone.system_settings.notes_placeholder')"
            optional
            :optional-label="t('common.optional')"
            :disabled="loading.save"
          />
          <!-- timezone -->
          <NeCombobox
            ref="timezoneRef"
            v-model="timezone"
            :options="timezones"
            :label="t('standalone.system_settings.timezone')"
            :invalid-message="error.timezone"
            :no-results-label="t('ne_combobox.no_results')"
            :limited-options-label="t('ne_combobox.limited_options_label')"
            :disabled="loading.save"
            :no-options-label="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            :optional-label="t('common.optional')"
          />
          <!-- local time -->
          <div>
            <NeFormItemLabel>{{ t('standalone.system_settings.local_time') }}</NeFormItemLabel>
            <div class="text-sm">
              <!-- (?) luci converts local time to UTC in order to display it -->
              <div>{{ formatInTimeZoneLoc(localTime, 'Pp', 'UTC') }}</div>
            </div>
          </div>
          <!-- sync buttons -->
          <div class="-ml-2.5">
            <NeButton
              kind="tertiary"
              size="lg"
              :loading="loading.syncWithNtpServer"
              :disabled="loading.syncWithNtpServer || loading.save"
              @click="syncWithNtpServer"
              >{{ t('standalone.system_settings.sync_with_ntp_server') }}</NeButton
            >
          </div>
        </div>
      </div>
      <!-- save button -->
      <div class="flex justify-end py-6">
        <NeButton
          kind="primary"
          size="lg"
          :loading="loading.save"
          :disabled="loading.save"
          @click="save"
        >
          <template #prefix>
            <font-awesome-icon :icon="['fas', 'floppy-disk']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('common.save') }}
        </NeButton>
      </div>
    </div>
  </div>
</template>
