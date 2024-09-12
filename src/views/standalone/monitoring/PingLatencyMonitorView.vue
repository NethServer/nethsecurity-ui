<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeInlineNotification,
  NeButton,
  NeSkeleton,
  getAxiosErrorMessage,
  NeHeading
} from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import NeMultiTextInput from '@/components/standalone/NeMultiTextInput.vue'
import { validateHost } from '@/lib/validation'
import { AxiosError } from 'axios'
const { t } = useI18n()

const formPing = ref({
  hostList: ['']
})
const loading = ref(true)
const saving = ref(false)

let errorConfiguration = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
let errorSaving = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
let errorForm = ref({
  hostList: ['']
})

onMounted(() => {
  getConfiguration()
})

async function getConfiguration() {
  loading.value = true
  try {
    let res = await ubusCall('ns.netdata', 'get-configuration', {})
    if (res?.data?.hosts) {
      formPing.value.hostList = res.data.hosts
    }
  } catch (exception: any) {
    errorConfiguration.value.notificationTitle = t('error.cannot_retrieve_netdata_configuration')
    errorConfiguration.value.notificationDescription = t(getAxiosErrorMessage(exception))
    errorConfiguration.value.notificationDetails = exception.toString()
  } finally {
    loading.value = false
  }
}

function validate() {
  let isValidationOk = true

  for (let [index, item] of formPing.value.hostList.entries()) {
    if (item) {
      let { valid, errMessage } = validateHost(item)

      if (!valid) {
        errorForm.value.hostList[index] = t(errMessage as string)
        isValidationOk = false
      }
    }
  }

  return isValidationOk
}

function save() {
  errorForm.value = {
    hostList: ['']
  }
  if (validate()) {
    saving.value = true

    let payload = {
      hosts: formPing.value.hostList.filter((item) => item)
    }

    ubusCall('ns.netdata', 'set-hosts', payload)
      .then((response) => {
        if (response?.data?.success && response.data.success) {
          getConfiguration()
        }
      })
      .catch((exception: AxiosError) => {
        errorSaving.value.notificationTitle = t('error.cannot_save_configuration')
        errorSaving.value.notificationDescription = t(getAxiosErrorMessage(exception))
        errorSaving.value.notificationDetails = exception.toString()
      })
      .finally(() => (saving.value = false))
  }
}
</script>

<template>
  <div>
    <NeHeading tag="h3" class="mb-7">
      {{ t('standalone.ping_latency_monitor.title') }}
    </NeHeading>
    <p class="mb-6 max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
      {{ t('standalone.ping_latency_monitor.description') }}
    </p>
    <NeSkeleton v-if="loading" :lines="5" />
    <NeInlineNotification
      v-if="!loading && errorConfiguration.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorConfiguration.notificationTitle"
      :description="errorConfiguration.notificationDescription"
    >
      <template v-if="errorConfiguration.notificationDetails" #details>
        {{ errorConfiguration.notificationDetails }}
      </template>
    </NeInlineNotification>
    <template v-if="!loading && !errorConfiguration.notificationTitle">
      <div class="max-w-md">
        <NeMultiTextInput
          v-model="formPing.hostList"
          :title="t('standalone.ping_latency_monitor.host_to_monitor')"
          :add-item-label="t('standalone.ping_latency_monitor.add_host')"
          :invalid-messages="errorForm.hostList"
          :disable-inputs="saving"
          :disable-add-button="saving"
          optional
          :optionalLabel="t('common.optional')"
          ref="hostListRef"
        />
        <div class="mt-6">
          <hr />
        </div>
        <NeInlineNotification
          v-if="errorSaving.notificationTitle"
          class="my-4"
          kind="error"
          :title="errorSaving.notificationTitle"
          :description="errorSaving.notificationDescription"
        >
          <template v-if="errorSaving.notificationDetails" #details>
            {{ errorSaving.notificationDetails }}
          </template>
        </NeInlineNotification>
        <div class="flex justify-end py-6">
          <NeButton :disabled="saving" :kind="'primary'" :loading="saving" @click="save()">
            <template #prefix>
              <FontAwesomeIcon :icon="['fas', 'floppy-disk']" class="h-4 w-4" aria-hidden="true" />
            </template>
            {{ t('common.save') }}
          </NeButton>
        </div>
      </div>
    </template>
  </div>
</template>
