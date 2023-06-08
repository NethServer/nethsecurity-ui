<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { validateHostname, validateRequired } from '@/lib/standalone/validation'
import { NeTitle, NeButton, NeTextInput } from '@nethserver/vue-tailwind-lib'
import { onMounted, ref } from 'vue'

let hostname = ref('')

// let systemConfig = ref({}) ////

let error = ref({
  hostname: ''
})

onMounted(async () => {
  getSystemConfig()
})

async function getSystemConfig() {
  //// move to library (return specific fields!)
  const res = await ubusCall('uci', 'get', {
    config: 'system'
  })

  const sections = Object.values(res.data.values)

  sections.forEach((section: any) => {
    switch (section['.type']) {
      case 'system':
        hostname.value = section.hostname
        break
    }
  })
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

  const isValidationOk = validate()

  if (!isValidationOk) {
    return
  }

  const res = await ubusCall('uci', 'set', {
    config: 'system',
    section: '@system[0]',
    values: {
      hostname: hostname.value
    }
  })

  console.log('uci set res', res) ////

  getSystemConfig()
}

//// move to store/library
async function getChanges() {
  const res = await ubusCall('uci', 'changes', {})

  console.log('changes', res) ////
}
</script>

<template>
  <div>
    <NeTitle>System settings</NeTitle>
    <!-- //// tabs -->
    <div class="max-w-xl">
      <NeTextInput label="Hostname" v-model="hostname" :invalidMessage="error.hostname" />
      <div class="flex justify-end mt-4">
        <NeButton @click="save">Save</NeButton>
      </div>
    </div>
  </div>
</template>
