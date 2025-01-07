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
import { AxiosError } from 'axios'

const notificationsStore = useNotificationsStore()
const { t } = useI18n()

const status = ref(false)
const uuid = ref('')

const error = ref({
  notificationTitle: '',
  notificationDescription: ''
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
    error.value.notificationTitle = t('error.cannot_retrieve_netify_informatics_configuration')
    error.value.notificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    loading.value = false
  }
}

function clearErrors() {
  error.value = {
    notificationTitle: '',
    notificationDescription: ''
  }
}

function save() {
  clearErrors()
  saving.value = true
  const state = status.value ? 'enable' : 'disable'
  ubusCall('ns.netifyd', state)
    .then((response) => {
      if (response.data && response.data.result && response.data.result === 'success') {
        setTimeout(() => {
          notificationsStore.createNotification({
            title: t('standalone.netify_informatics.netify_informatics_' + state),
            description: t(
              'standalone.netify_informatics.netify_informatics_' + state + '_description'
            ),
            kind: 'success'
          })
        }, 500)
      }
    })
    .catch((exception: AxiosError) => {
      console.error(exception)
      error.value.notificationTitle = t('error.cannot_save_configuration')
      error.value.notificationDescription = t(getAxiosErrorMessage(exception))
    })
    .finally(() => (saving.value = false))
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
        <NeLink href="https://portal.netify.ai/login" target="_blank">
          <FontAwesomeIcon class="mr-2" :icon="faArrowUpRightFromSquare" />
          {{ t('standalone.netify_informatics.open_netify_dashboard') }}
        </NeLink>
      </template>
      <NeSkeleton v-if="loading" :lines="5" />
      <NeInlineNotification
        v-if="error.notificationTitle"
        class="my-4"
        kind="error"
        :title="error.notificationTitle"
        :description="error.notificationDescription"
      />
      <div v-if="!error.notificationTitle && !loading" class="mb-8 flex flex-col gap-y-6">
        <div class="relative flex items-end gap-2">
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
          <NeButton v-else kind="secondary" size="md" @click="copyUuid" class="mb-px ml-2.5">
            <template #prefix>
              <FontAwesomeIcon :icon="faCopy" class="h-4 w-4" aria-hidden="true" />
            </template>
            {{ t('standalone.netify_informatics.copy') }}
          </NeButton>
        </div>
        <NeToggle
          v-model="status"
          :topLabel="t('standalone.netify_informatics.status')"
          :label="
            status
              ? t('standalone.netify_informatics.status_enabled')
              : t('standalone.netify_informatics.status_disabled')
          "
        />
        <div>
          <NeButton :disabled="loading" :loading="loading" kind="primary" @click="save()">
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
