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
import { focusElement } from '@nethserver/vue-tailwind-lib'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

let hostname = ref('')
let hostnameRef = ref()
let description = ref('')
let notes = ref('')
let localTime = ref(0)
let timezone = ref('')
let timezoneRef = ref()
let timezones = ref([])
let systemConfig: any = ref({})
let isLoadedSystemConfig = ref(false)
let isLoadedSystemInfo = ref(false)
let isLoadedTimezones = ref(false)

let error = ref({
  hostname: '',
  timezone: '',
  getSystemConfig: '',
  getSystemInfo: '',
  getTimezones: '',
  saveConfig: ''
})

const isLoaded = computed(() => {
  return isLoadedSystemConfig.value && isLoadedSystemInfo.value && isLoadedTimezones.value
})

watch(isLoadedSystemConfig, () => {
  if (isLoadedSystemConfig.value && isLoadedTimezones.value) {
    // set timezone in combobox
    timezone.value = systemConfig.value.system[0].zonename
  }
})

watch(isLoadedTimezones, () => {
  if (isLoadedTimezones.value && isLoadedSystemConfig.value) {
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
  try {
    const res = await ubusCall('system', 'info', {})
    localTime.value = Number(res.data.localtime * 1000)
    isLoadedSystemInfo.value = true
  } catch (err: any) {
    error.value.getSystemInfo = getAxiosErrorMessage(err)
  }
}

async function getSystemConfig() {
  try {
    const config = await getUciConfig('system')
    systemConfig.value = config
    hostname.value = config.system[0].hostname
    description.value = config.system[0].description
    notes.value = config.system[0].notes
    isLoadedSystemConfig.value = true
  } catch (err: any) {
    error.value.getSystemConfig = getAxiosErrorMessage(err)
  }
}

async function getTimezones() {
  try {
    const res = await ubusCall('luci', 'getTimezones', {})
    const tzList: any = []

    for (const [key, value] of Object.entries(res.data) as [string, any][]) {
      tzList.push({ id: key, label: key, timezone: value.tzstring })
    }
    timezones.value = tzList
    isLoadedTimezones.value = true
  } catch (err: any) {
    error.value.getTimezones = getAxiosErrorMessage(err)
  }
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

async function save() {
  error.value.hostname = ''
  error.value.timezone = ''
  const isValidationOk = validate()

  if (!isValidationOk) {
    return
  }

  const timezoneFound: any = timezones.value.find((tz: any) => tz.id === timezone.value)

  const res = await ubusCall('uci', 'set', {
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
  loadData()
}
</script>

<template>
  <NeInlineNotification
    v-if="error.getSystemConfig"
    kind="error"
    :title="t('error.cannot_load_system_config')"
    :description="t(error.getSystemConfig)"
    class="mb-4"
  />
  <NeInlineNotification
    v-if="error.getSystemInfo"
    kind="error"
    :title="t('error.cannot_load_system_info')"
    :description="t(error.getSystemInfo)"
    class="mb-4"
  />
  <NeInlineNotification
    v-if="error.getTimezones"
    kind="error"
    :title="t('error.cannot_load_timezones')"
    :description="t(error.getTimezones)"
    class="mb-4"
  />
  <NeInlineNotification
    v-if="error.saveConfig"
    kind="error"
    :title="t('error.cannot_save_configuration')"
    :description="t(error.saveConfig)"
    class="mb-4"
  />
  <NeSkeleton v-if="!isLoaded" size="lg" :lines="12" />
  <div v-else class="max-w-xl space-y-6">
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
    />
    <!-- notes -->
    <NeTextArea
      :label="t('standalone.system_settings.notes')"
      v-model.trim="notes"
      :placeholder="t('standalone.system_settings.notes_placeholder')"
    />
    <!-- timezone -->
    <NeComboBox
      v-model="timezone"
      :options="timezones"
      :clearable="false"
      :label="t('standalone.system_settings.timezone')"
      :invalidMessage="error.timezone"
      :noResultsLabel="t('ne_combobox.no_results')"
      :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
      :ref="timezoneRef"
    />
    <!-- local time -->
    <div>
      <NeFormItemLabel>{{ t('standalone.system_settings.local_time') }}</NeFormItemLabel>
      <div class="text-sm">{{ new Date(localTime).toLocaleString() }}</div>
    </div>
    <!-- save button -->
    <div class="flex justify-end">
      <NeButton @click="save">{{ t('common.save') }}</NeButton>
    </div>
  </div>
</template>
