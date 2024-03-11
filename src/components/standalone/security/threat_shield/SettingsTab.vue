<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import FormLayout from '../../FormLayout.vue'
import { NeToggle, getAxiosErrorMessage } from '@nethserver/vue-tailwind-lib'
import { NeButton, NeSkeleton, NeInlineNotification } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { onMounted } from 'vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

const loading = ref(true)
const isSavingChanges = ref(false)
const isThreatShieldEnabled = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})

async function fetchSettings() {
  try {
    loading.value = true
    isThreatShieldEnabled.value = (
      await ubusCall('ns.threatshield', 'list-settings')
    ).data.data.enabled
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_threat_shield_settings')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    loading.value = false
  }
}

async function reloadSettings() {
  await uciChangesStore.getChanges()
  await fetchSettings()
}

async function saveSettings() {
  try {
    isSavingChanges.value = true
    await ubusCall('ns.threatshield', 'edit-settings', {
      enabled: isThreatShieldEnabled.value
    })
    reloadSettings()
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_threat_shield_settings')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    isSavingChanges.value = false
  }
}

onMounted(() => {
  fetchSettings()
})
</script>

<template>
  <NeSkeleton :lines="6" v-if="loading" size="lg" />
  <div class="max-w-4xl" v-else>
    <NeInlineNotification
      kind="error"
      class="mb-6"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      v-if="error.notificationDescription"
    >
      <template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template>
    </NeInlineNotification>
    <FormLayout
      :title="t('standalone.threat_shield.threat_shield_status')"
      :description="t('standalone.threat_shield.threat_shield_status_description')"
    >
      <NeToggle
        :top-label="t('standalone.threat_shield.status')"
        :label="isThreatShieldEnabled ? t('common.enabled') : t('common.disabled')"
        v-model="isThreatShieldEnabled"
      />
    </FormLayout>
    <hr />
    <div class="mt-6 flex flex-row justify-end">
      <NeButton
        kind="primary"
        :disabled="isSavingChanges"
        :loading="isSavingChanges"
        @click="saveSettings()"
        >{{ t('common.save') }}</NeButton
      >
    </div>
  </div>
</template>
