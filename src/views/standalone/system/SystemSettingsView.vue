<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getUciConfig, ubusCall } from '@/lib/standalone/ubus'
import { validateHostname, validateRequired } from '@/lib/standalone/validation'
import { NeTitle, NeButton, NeTextInput } from '@nethserver/vue-tailwind-lib'
import { onMounted, ref } from 'vue'

let hostname = ref('')
let description = ref('')

let error = ref({
  hostname: '',
  description: ''
})

onMounted(async () => {
  getSystemConfig()

  //// remove
  // getUciConfig('firewall') ////
})

async function getSystemConfig() {
  const config = await getUciConfig('system')
  hostname.value = config.system[0].hostname
  description.value = config.system[0].description
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

  const isValidationOk = validate()

  if (!isValidationOk) {
    return
  }

  const res = await ubusCall('uci', 'set', {
    config: 'system',
    section: '@system[0]',
    values: {
      hostname: hostname.value,
      description: description.value
    }
  })
  getSystemConfig()
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
      />
      <div class="flex justify-end">
        <NeButton @click="save">Save</NeButton>
      </div>
    </div>
  </div>
</template>
