<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getUciConfig, ubusCall } from '@/lib/standalone/ubus'
import { validateHostname, validateRequired } from '@/lib/validation'
import {
  NeButton,
  NeTextInput,
  NeTextArea,
  NeFormItemLabel,
  NeSkeleton,
  NeComboBox,
  NeInlineNotification,
  getAxiosErrorMessage
} from '@nethserver/vue-tailwind-lib'
import { focusElement, formatInTimeZoneLoc } from '@nethserver/vue-tailwind-lib'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

let hostname = ref('')
let hostnameRef = ref()
let description = ref('')
let notes = ref('')
let localTime: any = ref(null)
let timezone = ref('')
let timezoneRef = ref()
let timezones = ref([])
let systemConfig: any = ref({})
let isLoadingSystemConfig = ref(true)
let isLoadingSystemInfo = ref(true)
let isLoadingTimezones = ref(true)
//// show spinner in button
let isLoadingSyncWithBrowser = ref(false)
let isLoadingSyncWithNtpServer = ref(false)

let error = ref({
  hostname: '',
  timezone: '',
  notificationTitle: '',
  notificationDescription: ''
})

const isLoading = computed(() => {
  return isLoadingSystemConfig.value || isLoadingSystemInfo.value || isLoadingTimezones.value
})

watch(isLoadingSystemConfig, () => {
  if (!isLoadingSystemConfig.value && !isLoadingTimezones.value) {
    // set timezone in combobox
    timezone.value = systemConfig.value.system[0].zonename
  }
})

watch(isLoadingTimezones, () => {
  if (!isLoadingTimezones.value && !isLoadingSystemConfig.value) {
    // set timezone in combobox
    timezone.value = systemConfig.value.system[0].zonename
  }
})

onMounted(() => {
  loadData()
})

async function loadData() {
  getSystemConfig()
  getSystemInfo()
  getTimezones()
}

async function getSystemInfo() {
  isLoadingSystemInfo.value = true

  try {
    const res = await ubusCall('system', 'info', {})
    localTime.value = new Date(res.data.localtime * 1000)
    isLoadingSystemInfo.value = true
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_system_info')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  isLoadingSystemInfo.value = false
}

async function getSystemConfig() {
  isLoadingSystemConfig.value = true

  try {
    const config = await getUciConfig('system')
    systemConfig.value = config
    hostname.value = config.system[0].hostname
    description.value = config.system[0].description
    notes.value = config.system[0].notes
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_system_config')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  isLoadingSystemConfig.value = false
}

async function getTimezones() {
  isLoadingTimezones.value = true

  try {
    const res = await ubusCall('luci', 'getTimezones', {})
    const tzList: any = []

    for (const [key, value] of Object.entries(res.data) as [string, any][]) {
      tzList.push({ id: key, label: key, timezone: value.tzstring })
    }
    timezones.value = tzList
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_timezones')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  isLoadingTimezones.value = false
}

function validate() {
  let isValidationOk = true

  // hostname

  {
    // check required
    let { valid, errMessage } = validateRequired(hostname.value)
    if (!valid) {
      error.value.hostname = t(errMessage as string)
      isValidationOk = false
      focusElement(hostnameRef)
    } else {
      {
        // check sintax
        let { valid, errMessage } = validateHostname(hostname.value)
        if (!valid) {
          error.value.hostname = t(errMessage as string)
          isValidationOk = false
          focusElement(hostnameRef)
        }
      }
    }
  }

  // timezone

  {
    // check required
    let { valid, errMessage } = validateRequired(timezone.value)
    if (!valid) {
      error.value.timezone = t(errMessage as string)
      isValidationOk = false
      // focusElement(timezoneRef) //// fix: not working
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
  error.value.hostname = ''
  error.value.timezone = ''
  //// clear other errors
  const isValidationOk = validate()

  if (!isValidationOk) {
    return
  }

  try {
    await setSystemConfig()
    await enableSysntpd()
    loadData()
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_save_configuration')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
}

async function syncWithBrowser() {
  isLoadingSyncWithBrowser.value = true
  const browserTime = Math.floor(Date.now() / 1000)

  try {
    await ubusCall('luci', 'setLocaltime', {
      localtime: browserTime
    })
    getSystemInfo()
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_sync_local_time')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  isLoadingSyncWithBrowser.value = false
}

async function syncWithNtpServer() {
  isLoadingSyncWithNtpServer.value = true

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
  isLoadingSyncWithNtpServer.value = false
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
    <NeSkeleton v-if="isLoading" size="lg" :lines="10" />
    <div v-else>
      <!-- main section -->
      <div class="border-b pb-6 border-gray-200 dark:border-gray-700">
        <div class="space-y-6">
          <!-- hostname -->
          <NeTextInput
            :label="t('standalone.system_settings.hostname')"
            v-model.trim="hostname"
            :invalidMessage="error.hostname"
            ref="hostnameRef"
          />
          <!-- description -->
          <NeTextInput
            :label="t('standalone.system_settings.short_description')"
            v-model.trim="description"
            :placeholder="t('standalone.system_settings.short_description_placeholder')"
            optional
            :optionalLabel="t('common.optional')"
          />
          <!-- notes -->
          <NeTextArea
            :label="t('standalone.system_settings.notes')"
            v-model.trim="notes"
            :placeholder="t('standalone.system_settings.notes_placeholder')"
            optional
            :optionalLabel="t('common.optional')"
          />
          <!-- timezone -->
          <NeComboBox
            v-model="timezone"
            :options="timezones"
            :label="t('standalone.system_settings.timezone')"
            :invalidMessage="error.timezone"
            :noResultsLabel="t('ne_combobox.no_results')"
            :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
            :ref="timezoneRef"
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
          <div>
            <NeButton
              @click="syncWithBrowser"
              kind="tertiary"
              :disabled="isLoadingSyncWithBrowser"
              class="-ml-2.5"
              >{{ t('standalone.system_settings.sync_with_browser') }}</NeButton
            >
            <NeButton
              @click="syncWithNtpServer"
              kind="tertiary"
              :disabled="isLoadingSyncWithNtpServer"
              class="ml-4"
              >{{ t('standalone.system_settings.sync_with_ntp_server') }}</NeButton
            >
          </div>
        </div>
      </div>
      <!-- save button -->
      <div class="flex justify-end py-6">
        <NeButton kind="primary" @click="save">
          <template #prefix>
            <font-awesome-icon :icon="['fas', 'floppy-disk']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('common.save') }}
        </NeButton>
      </div>
    </div>
  </div>
</template>
