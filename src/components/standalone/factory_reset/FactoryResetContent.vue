<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeProgressBar,
  NeInlineNotification,
  NeButton,
  NeSkeleton,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import FormLayout from '@/components/standalone/FormLayout.vue'

const { t } = useI18n()
const RESET_WAIT_TIME = 45000

const formReset = ref({
  unit_name: ''
})

const loading = ref(true)
const loadingReset = ref(false)
const isResetting = ref(false)
const showModalFactoryReset = ref(false)
const currentVersion = ref('')
const unitName = ref()
const unitNameRef = ref()
const resetProgress = ref(0)
const resetInterval = ref<number | undefined>()
const resetTimeout = ref<number | undefined>()

let errorSystemInfo = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})

let errorResetting = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})

onMounted(() => {
  getConfiguration()
})

async function getConfiguration() {
  try {
    let res = await ubusCall('ns.dashboard', 'system-info', {})
    if (res?.data?.result) {
      if (res?.data?.result?.hostname) {
        unitName.value = res.data.result.hostname
      }
      if (res?.data?.result?.version?.release) {
        currentVersion.value = res.data.result.version.release
      }
    }
  } catch (exception: any) {
    errorSystemInfo.value.notificationTitle = t('error.cannot_load_system_config')
    errorSystemInfo.value.notificationDescription = t(getAxiosErrorMessage(exception))
    errorSystemInfo.value.notificationDetails = exception.toString()
  } finally {
    loading.value = false
  }
}

async function startFactoryReset() {
  loadingReset.value = true
  try {
    let res = await ubusCall('ns.factoryreset', 'reset', {})
    if (res?.data?.result && res?.data?.result === 'success') {
      isResetting.value = true
      showModalFactoryReset.value = false
      setResetTimer()
    }
  } catch (exception: any) {
    errorResetting.value.notificationTitle = t('error.cannot_perform_factory_reset')
    errorResetting.value.notificationDescription = t(getAxiosErrorMessage(exception))
    errorResetting.value.notificationDetails = exception.toString()
  } finally {
    loadingReset.value = false
  }
}

function setResetTimer() {
  resetTimeout.value = setTimeout(() => {
    location.reload()
  }, RESET_WAIT_TIME)

  resetInterval.value = setInterval(() => {
    resetProgress.value += 0.5
  }, RESET_WAIT_TIME / 200)
}
</script>

<template>
  <div>
    <NeSkeleton v-if="loading" :lines="5" />
    <NeInlineNotification
      v-if="!loading && errorSystemInfo.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorSystemInfo.notificationTitle"
      :description="errorSystemInfo.notificationDescription"
    >
      <template v-if="errorSystemInfo.notificationDetails" #details>
        {{ errorSystemInfo.notificationDetails }}
      </template>
    </NeInlineNotification>
    <template v-if="!loading && !errorSystemInfo.notificationTitle">
      <FormLayout class="max-w-6xl text-sm text-gray-500 dark:text-gray-400">
        <template #description>
          <p class="mb-4">
            {{ t('standalone.factory_reset.description') }}
          </p>
          <div class="flex">
            <FontAwesomeIcon
              :icon="['fa', 'circle-info']"
              class="mr-2 mt-1 text-indigo-700 dark:text-indigo-300"
            />
            <p class="mb-8">
              {{ t('standalone.factory_reset.description_helper') }}
            </p>
          </div>
        </template>
        <div>
          <p class="mb-2 text-sm font-normal text-gray-500 dark:text-gray-400">
            {{ t('standalone.factory_reset.current_version') }}: {{ currentVersion }}
          </p>
          <div>
            <NeButton kind="secondary" @click="showModalFactoryReset = true">
              <template #prefix>
                <FontAwesomeIcon :icon="['fa', 'arrow-rotate-left']" aria-hidden="true" />
              </template>
              {{ t('standalone.factory_reset.perform_factory_reset') }}
            </NeButton>
          </div>
        </div>
      </FormLayout>
    </template>
    <NeModal
      :primary-label="t('standalone.factory_reset.perform_factory_confirm')"
      :primary-button-disabled="unitName !== formReset.unit_name"
      :primary-button-loading="loadingReset"
      :title="t('standalone.factory_reset.perform_factory_reset')"
      :visible="showModalFactoryReset"
      :cancel-label="t('common.cancel')"
      kind="warning"
      primary-button-kind="danger"
      :close-aria-label="t('common.close')"
      @close="showModalFactoryReset = false"
      @primaryClick="startFactoryReset()"
    >
      {{ t('standalone.factory_reset.perform_factory_reset_description') }}
      <NeTextInput
        class="mt-4"
        v-model="formReset.unit_name"
        :disabled="loadingReset"
        :label="t('standalone.factory_reset.type_unit_name', { unit: unitName })"
        ref="unitNameRef"
      />
      <NeInlineNotification
        v-if="errorResetting.notificationTitle"
        class="my-4"
        kind="error"
        :title="errorResetting.notificationTitle"
        :description="errorResetting.notificationDescription"
      >
        <template v-if="errorResetting.notificationDetails" #details>
          {{ errorResetting.notificationDetails }}
        </template>
      </NeInlineNotification>
    </NeModal>
    <NeModal
      :primary-label="t('common.cancel')"
      :primary-button-disabled="true"
      :title="t('standalone.factory_reset.title')"
      :visible="isResetting"
      cancel-label=""
      kind="neutral"
      :close-aria-label="t('common.close')"
      @close="isResetting = false"
    >
      {{ t('standalone.factory_reset.resetting_description') }}
      <NeProgressBar class="my-4" :progress="resetProgress" />
    </NeModal>
  </div>
</template>
