<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { useNotificationsStore } from '@/stores/notifications'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faArrowUpRightFromSquare, faCopy, faFloppyDisk } from '@fortawesome/free-solid-svg-icons'
import {
  NeSkeleton,
  NeTextInput,
  getAxiosErrorMessage,
  NeInlineNotification,
  NeTooltip,
  NeButton,
  NeLink
} from '@nethesis/vue-components'
import { NeToggle } from '@nethesis/vue-components'
import { ubusCall } from '@/lib/standalone/ubus'

const notificationsStore = useNotificationsStore()
const { t } = useI18n()

const status = ref(false)
const uuid = ref('')

const error = ref({
  getNotificationTitle: '',
  getNotificationDescription: '',
  saveNotificationTitle: '',
  saveNotificationDescription: ''
})

const loading = ref(false)
const saving = ref(false)
const uuidRef = ref()
const justCopied = ref(false)
onMounted(() => {
  clearErrors()
  getConfiguration()
})

async function getConfiguration() {
  try {
    loading.value = true
    let getDataConfiguration = await ubusCall('ns.netifyd', 'status', {})
    if (getDataConfiguration && getDataConfiguration.data) {
      let configuration = getDataConfiguration.data
      status.value = configuration.enabled
      uuid.value = configuration.uuid
    }
  } catch (exception: any) {
    console.error(exception)
    error.value.getNotificationTitle = t('error.cannot_retrieve_netify_informatics_configuration')
    error.value.getNotificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    loading.value = false
  }
}

function clearErrors() {
  error.value = {
    getNotificationTitle: '',
    getNotificationDescription: '',
    saveNotificationTitle: '',
    saveNotificationDescription: ''
  }
}

async function saveSettings() {
  clearErrors()
  try {
    saving.value = true

    const state = status.value ? 'enable' : 'disable'
    await ubusCall('ns.netifyd', state)
    notificationsStore.createNotification({
      title: t('standalone.netify_informatics.metadata_sending_' + state),
      description: t(
        'standalone.netify_informatics.metadata_sending_configuration_saved_successfully'
      ),
      kind: 'success'
    })
    getConfiguration()
  } catch (err: any) {
    console.error(err)
    error.value.saveNotificationTitle = t('error.cannot_save_configuration')
    error.value.saveNotificationDescription = t(getAxiosErrorMessage(err))
  } finally {
    saving.value = false
  }
}

function copyUuid() {
  navigator.clipboard.writeText(uuid.value)
  justCopied.value = true
  setTimeout(() => {
    justCopied.value = false
  }, 3000)
}
</script>

<template>
  <div>
    <FormLayout class="max-w-6xl">
      <template #description>
        <p>{{ t('standalone.netify_informatics.content_description') }}</p>
        <NeLink href="https://portal.netify.ai/login" target="_blank" class="mt-4 inline-block">
          <FontAwesomeIcon class="mr-2" :icon="faArrowUpRightFromSquare" />
          {{ t('standalone.netify_informatics.open_netify_dashboard') }}
        </NeLink>
      </template>
      <NeSkeleton v-if="loading" :lines="5" />
      <NeInlineNotification
        v-if="error.getNotificationTitle"
        class="my-4"
        kind="error"
        :title="error.getNotificationTitle"
        :description="error.getNotificationDescription"
      />
      <NeInlineNotification
        v-if="error.saveNotificationTitle"
        class="my-4"
        kind="error"
        :title="error.saveNotificationTitle"
        :description="error.saveNotificationDescription"
      />
      <div v-if="!loading" class="mb-8 flex flex-col gap-y-6">
        <NeToggle
          v-model="status"
          :disabled="error.getNotificationTitle !== ''"
          :topLabel="t('standalone.netify_informatics.metadata_sending')"
          :label="
            status
              ? t('standalone.netify_informatics.status_enabled')
              : t('standalone.netify_informatics.status_disabled')
          "
        >
          <template #topTooltip>
            <NeTooltip>
              <template #content>
                {{ t('standalone.netify_informatics.enable_metadata_sending') }}
              </template>
            </NeTooltip>
          </template>
        </NeToggle>
        <div v-if="status" class="relative flex items-end gap-2">
          <NeTextInput
            v-model="uuid"
            disabled
            :label="t('standalone.netify_informatics.uuid')"
            ref="uuidRef"
          >
          </NeTextInput>
          <NeTooltip v-if="justCopied" triggerEvent="mouseenter focus" placement="top-start">
            <template #trigger>
              <NeButton kind="secondary" size="md" @click="copyUuid" class="mb-px ml-2.5">
                <template #prefix>
                  <FontAwesomeIcon :icon="faCopy" class="h-4 w-4" aria-hidden="true" />
                </template>
                {{ t('standalone.netify_informatics.copy') }}
              </NeButton>
            </template>
            <template #content>
              {{ t('standalone.netify_informatics.copied_to_clipboard') }}
            </template>
          </NeTooltip>
          <NeButton
            v-else
            :disabled="error.getNotificationTitle !== ''"
            kind="secondary"
            size="md"
            @click="copyUuid"
            class="mb-px ml-2.5"
          >
            <template #prefix>
              <FontAwesomeIcon :icon="faCopy" class="h-4 w-4" aria-hidden="true" />
            </template>
            {{ t('standalone.netify_informatics.copy') }}
          </NeButton>
        </div>
        <div>
          <NeButton
            :disabled="error.getNotificationTitle !== '' || saving"
            :loading="loading"
            kind="primary"
            @click="saveSettings()"
          >
            <template #prefix>
              <FontAwesomeIcon :icon="faFloppyDisk" class="h-4 w-4" aria-hidden="true" />
            </template>
            {{ t('common.save') }}
          </NeButton>
        </div>
      </div>
    </FormLayout>
  </div>
</template>
