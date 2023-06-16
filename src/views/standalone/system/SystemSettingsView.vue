<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getUciConfig, ubusCall } from '@/lib/standalone/ubus'
import { validateHostname, validateRequired } from '@/lib/standalone/validation'
import {
  NeTitle,
  NeButton,
  NeTextInput,
  NeTextArea,
  NeFormItemLabel
} from '@nethserver/vue-tailwind-lib'
import { focusElement } from '@nethserver/vue-tailwind-lib'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

let hostname = ref('')
let hostnameRef = ref()
let description = ref('')
let notes = ref('')
let localTime = ref(0)

let error = ref({
  hostname: ''
})

onMounted(() => {
  loadData()
})

async function loadData() {
  getSystemConfig()

  const res = await ubusCall('system', 'info', {})
  localTime.value = Number(res.data.localtime * 1000)

  //// remove
  // const network = await getUciConfig('network') ////
  // console.log('network', network)
}

async function getSystemConfig() {
  const config = await getUciConfig('system')
  hostname.value = config.system[0].hostname
  description.value = config.system[0].description
  notes.value = config.system[0].notes
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
  return isValidationOk
}

async function save() {
  error.value.hostname = ''
  const isValidationOk = validate()

  if (!isValidationOk) {
    return
  }

  const res = await ubusCall('uci', 'set', {
    config: 'system',
    section: '@system[0]',
    values: {
      hostname: hostname.value,
      description: description.value,
      notes: notes.value
    }
  })
  loadData()
}
</script>

<template>
  <div>
    <NeTitle>{{ t('standalone.system_settings.title') }}</NeTitle>
    <!-- //// tabs -->
    <div class="max-w-xl space-y-6">
      <NeTextInput
        :label="t('standalone.system_settings.hostname')"
        v-model="hostname"
        :invalidMessage="error.hostname"
        ref="hostnameRef"
      />
      <NeTextInput
        :label="t('standalone.system_settings.short_description')"
        v-model="description"
        :placeholder="t('standalone.system_settings.short_description_placeholder')"
      />
      <NeTextArea
        :label="t('standalone.system_settings.notes')"
        v-model="notes"
        :placeholder="t('standalone.system_settings.notes_placeholder')"
      />
      <div>
        <NeFormItemLabel>{{ t('standalone.system_settings.local_time') }}</NeFormItemLabel>
        <div class="text-sm">{{ new Date(localTime).toLocaleString() }}</div>
      </div>
      <div class="flex justify-end">
        <NeButton @click="save">{{ t('common.save') }}</NeButton>
      </div>
    </div>
  </div>
</template>
