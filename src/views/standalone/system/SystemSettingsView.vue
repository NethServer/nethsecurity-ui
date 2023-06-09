<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getUciConfig, ubusCall } from '@/lib/standalone/ubus'
import { validateHostname, validateRequired } from '@/lib/standalone/validation'
import { NeTitle, NeButton, NeTextInput, NeTextArea } from '@nethserver/vue-tailwind-lib'
import { onMounted, ref } from 'vue'

let hostname = ref('')
let description = ref('')
let notes = ref('')
let localTime = ref(0)

let error = ref({
  hostname: '',
  description: '',
  notes: ''
})

onMounted(async () => {
  loadData()
})

async function loadData() {
  getSystemConfig()

  const res = await ubusCall('system', 'info', {})
  localTime.value = Number(res.data.localtime * 1000)

  //// remove
  // const network = await getUciConfig('network') //// ////
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
      error.value.hostname = errMessage as string
      isValidationOk = false
      //// focus hostname
    } else {
      {
        // check sintax
        let { valid, errMessage } = validateHostname(hostname.value)
        if (!valid) {
          error.value.hostname = errMessage as string
          isValidationOk = false
          //// focus hostname
        }
      }
    }
  }
  return isValidationOk
}

async function save() {
  error.value.hostname = ''
  error.value.description = ''
  error.value.notes = ''

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
    <NeTitle>System settings</NeTitle>
    <!-- //// tabs -->
    <div class="max-w-xl space-y-6">
      <NeTextInput label="Hostname" v-model="hostname" :invalidMessage="error.hostname" />
      <NeTextInput
        label="Short description"
        v-model="description"
        :invalidMessage="error.description"
        placeholder="Short description about this firewall"
      />
      <NeTextArea
        label="Notes"
        v-model="notes"
        :invalidMessage="error.notes"
        placeholder="Notes about this firewall"
      />
      <!-- //// use component? -->
      <div>
        <label class="block text-sm font-medium leading-6 text-gray-700 dark:text-gray-200"
          >Local time</label
        >
        <!-- <div class="mt-2 text-sm">{{ formatDate(new Date(localTime), 'yyyy-MM-dd HH:mm') }}</div> -->
        <div class="mt-2 text-sm">{{ new Date(localTime).toLocaleString() }}</div>
      </div>
      <div class="flex justify-end">
        <NeButton @click="save">Save</NeButton>
      </div>
    </div>
  </div>
</template>
