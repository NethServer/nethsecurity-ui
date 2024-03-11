<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeInlineNotification,
  NeButton,
  NeSkeleton,
  NeBadge,
  NeEmptyState,
  byteFormat1024,
  formatDurationLoc,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { faCircleCheck, faCircleXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { ubusCall } from '@/lib/standalone/ubus'
import NeTable from '@/components/standalone/NeTable.vue'

const { t } = useI18n()
const emit = defineEmits(['goToSetting'])

let hotspotSession: any = ref({})
let loading = ref(true)
let activeConfiguration = ref(false)
let error = ref({
  notificationTitle: '',
  notificationDescription: ''
})

onMounted(async () => {
  await getConfiguration()
  await loadListSessions()
  loading.value = false
})

async function getConfiguration() {
  try {
    let res = await ubusCall('ns.dedalo', 'get-configuration', {})
    activeConfiguration.value = res.data.configuration.hotspot_id != ''
  } catch (exception: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_configuration')
    error.value.notificationDescription = t(getAxiosErrorMessage(exception))
  }
}

async function loadListSessions() {
  try {
    const res = await ubusCall('ns.dedalo', 'list-sessions')
    if (res.data && res.data.sessions && res.data.sessions.length) {
      hotspotSession.value = res.data.sessions
    }
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_load_hotspot_configuration')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
}
</script>

<template>
  <div>
    <NeSkeleton v-if="loading" :lines="15" />
    <NeInlineNotification
      v-if="!loading && error.notificationTitle"
      class="my-4"
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
    />
    <template v-if="!loading && !error.notificationTitle">
      <!-- IF CONFIGURATION NOT CONNECTED -->
      <NeEmptyState
        v-if="!activeConfiguration"
        :title="t('standalone.hotspot.status.no_hotspot_configuration_found')"
        :description="t('standalone.hotspot.status.no_hotspot_configuration_found_description')"
        :icon="['fa', 'wifi']"
      >
        <NeButton kind="primary" size="lg" @click="emit('goToSetting')">
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'fa-arrow-right']" aria-hidden="true" />
          </template>
          {{ t('standalone.hotspot.status.no_hotspot_configuration_found_button') }}
        </NeButton>
      </NeEmptyState>
      <!-- IF CONFIGURATION CONNECTED && EMPTY SESSIIONS -->
      <template v-else>
        <div class="mb-6 flex flex-row justify-end">
          <NeBadge
            :icon="['fas', 'check']"
            :text="t('standalone.hotspot.status.hotspot_configured')"
            kind="success"
          />
        </div>
        <NeEmptyState
          v-if="!hotspotSession.length"
          :title="t('standalone.hotspot.status.empty_sessions')"
          :description="t('standalone.hotspot.status.empty_sessions_description')"
          :icon="['fas', 'circle-info']"
        />
        <div v-if="hotspotSession.length > 0">
          <NeTable
            :data="hotspotSession"
            :headers="[
              {
                key: 'mac_address',
                label: t('standalone.hotspot.status.mac_address')
              },
              {
                key: 'ip_address',
                label: t('standalone.hotspot.status.ip_address')
              },
              {
                key: 'login_status',
                label: t('standalone.hotspot.status.login_status')
              },
              {
                key: 'session_key',
                label: t('standalone.hotspot.status.session_key')
              },
              {
                key: 'session_time',
                label: t('standalone.hotspot.status.session_time')
              },
              {
                key: 'idle_time',
                label: t('standalone.hotspot.status.idle_time')
              },
              {
                key: 'downloaded',
                label: t('standalone.hotspot.status.downloaded')
              },
              {
                key: 'uploaded',
                label: t('standalone.hotspot.status.uploaded')
              }
            ]"
          >
            <template #mac_address="{ item }">
              <div class="flex items-center gap-x-4">
                {{ item.macAddress }}
              </div>
            </template>
            <template #ip_address="{ item }">
              <div class="flex flex-wrap gap-2">
                {{ item.ipAddress }}
              </div>
            </template>
            <template #login_status="{ item }">
              <div class="flex items-center gap-x-2">
                <template v-if="item.status && item.status === 'pass'">
                  <FontAwesomeIcon :icon="faCircleCheck" />
                </template>
                <template v-else>
                  <FontAwesomeIcon :icon="faCircleXmark" />
                </template>
                <span v-if="item.status === 'pass'">
                  {{ t('standalone.hotspot.status.authenticated') }}
                  <span v-if="item.temporary">
                    ({{ t('standalone.hotspot.status.temporary') }})
                  </span>
                </span>
                <span v-else>
                  {{ t('standalone.hotspot.status.not_authenticated') }}
                </span>
              </div>
            </template>
            <template #session_key="{ item }">
              <div class="flex items-center gap-x-2">
                {{ item.sessionKey }}
              </div>
            </template>
            <template #session_time="{ item }">
              <div class="flex items-center gap-x-2">
                {{ item.sessionTimeElapsed ? formatDurationLoc(item.sessionTimeElapsed) : '-' }}
              </div>
            </template>
            <template #idle_time="{ item }">
              <div class="flex items-center gap-x-2">
                {{ item.idleTimeElapsed ? formatDurationLoc(item.idleTimeElapsed) : '-' }}
              </div>
            </template>
            <template #downloaded="{ item }">
              {{ item.inputOctetsDownloaded ? byteFormat1024(item.inputOctetsDownloaded) : '-' }}
            </template>
            <template #uploaded="{ item }">
              {{ item.outputOctetsUploaded ? byteFormat1024(item.outputOctetsUploaded) : '-' }}
            </template>
          </NeTable>
        </div>
      </template>
    </template>
  </div>
</template>
