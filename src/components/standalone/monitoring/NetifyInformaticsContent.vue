<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { useNotificationsStore } from '@/stores/notifications'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faArrowUpRightFromSquare, faCopy, faCheck } from '@fortawesome/free-solid-svg-icons'
import { NeButton } from '@nethesis/vue-components'
import {
  NeSkeleton,
  NeFormItemLabel,
  NeTextInput,
  getAxiosErrorMessage,
  NeInlineNotification,
  NeBadge
} from '@nethesis/vue-components'
import { NeToggle } from '@nethesis/vue-components'
import { ubusCall } from '@/lib/standalone/ubus'
import { AxiosError } from 'axios'

const notificationsStore = useNotificationsStore()
const { t } = useI18n()

interface Form {
  status: boolean
  uuid: string
}

const form = ref<Form>({
  status: false,
  uuid: ''
})

interface errorObject {
  notificationTitle: string
  notificationDescription: string
  uuid: string
}
const objError: errorObject = {
  notificationTitle: '',
  notificationDescription: '',
  uuid: ''
}

const isError = ref(false)
const loading = ref(false)
const saving = ref(false)
const uuidRef = ref()
const justCopied = ref(false)

const error: Ref<errorObject> = ref({ ...objError })
const errorLoadingConfiguration: Ref<errorObject> = ref({ ...objError })
const errorSaving: Ref<errorObject> = ref({ ...objError })

onMounted(() => {
  getConfiguration()
})

async function getConfiguration() {
  try {
    loading.value = true
    let getDataConfiguration = await ubusCall('ns.netifyd', 'status', {})
    if (getDataConfiguration && getDataConfiguration.data) {
      let configuration = getDataConfiguration.data
      form.value.status = configuration.enabled
      form.value.uuid = configuration.uuid
    }
  } catch (exception: any) {
    isError.value = true
    errorLoadingConfiguration.value.notificationTitle = t(
      'error.cannot_retrieve_netify_informatics_configuration'
    )
    errorLoadingConfiguration.value.notificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    loading.value = false
  }
}

function clearErrors() {
  error.value = {
    notificationTitle: '',
    notificationDescription: '',
    uuid: ''
  }
}

function handleSaveAutomaticToggle() {
  clearErrors()
  saving.value = true
  const status = form.value.status ? 'enable' : 'disable'
  ubusCall('ns.netifyd', status)
    .then((response) => {
      if (response.data && response.data.result && response.data.result === 'success') {
        setTimeout(() => {
          notificationsStore.createNotification({
            title: t('standalone.netify_informatics.netify_informatics_' + status),
            description: t(
              'standalone.netify_informatics.netify_informatics_' + status + '_description'
            ),
            kind: 'success'
          })
        }, 500)
      }
    })
    .catch((exception: AxiosError) => {
      errorSaving.value.notificationTitle = t('error.cannot_save_configuration')
      errorSaving.value.notificationDescription = t(getAxiosErrorMessage(exception))
    })
    .finally(() => (saving.value = false))
}

function openDashboard() {
  window.open('https://portal.netify.ai/login', '_blank')
}
function copyUuid() {
  navigator.clipboard.writeText(form.value.uuid)
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
        <NeButton kind="tertiary" size="lg" @click="openDashboard()" class="ml-2 shrink-0">
          <template #prefix>
            <FontAwesomeIcon :icon="faArrowUpRightFromSquare" aria-hidden="true" />
          </template>
          {{ t('standalone.netify_informatics.open_netify_dashboard') }}</NeButton
        >
      </template>
      <NeSkeleton v-if="loading" :lines="5" />
      <NeInlineNotification
        v-if="errorLoadingConfiguration.notificationTitle"
        class="my-4"
        kind="error"
        :title="errorLoadingConfiguration.notificationTitle"
        :description="errorLoadingConfiguration.notificationDescription"
      />
      <div v-if="!isError && !loading" class="mb-8 flex flex-col gap-y-6">
        <div class="relative flex items-center gap-2">
          <NeTextInput
            v-model="form.uuid"
            disabled
            :invalid-message="error.uuid"
            :label="t('standalone.netify_informatics.uuid')"
            ref="uuidRef"
          >
          </NeTextInput>
          <NeButton kind="tertiary" size="sm" @click="copyUuid" class="ml-2.5 mt-8">
            <template #prefix>
              <FontAwesomeIcon :icon="faCopy" class="h-4 w-4" aria-hidden="true" />
            </template>
            {{ t('standalone.netify_informatics.copy') }}
          </NeButton>
          <NeBadge
            class="ml-2.5 mt-8"
            v-if="justCopied"
            :icon="faCheck"
            :text="t('standalone.netify_informatics.copied_to_clipboard')"
            kind="secondary"
            :rounded="false"
            size="sm"
          />
        </div>
        <NeFormItemLabel>{{ t('standalone.netify_informatics.status') }}</NeFormItemLabel>
        <NeToggle
          v-model="form.status"
          @update:model-value="handleSaveAutomaticToggle"
          :label="
            form.status
              ? t('standalone.netify_informatics.status_enabled')
              : t('standalone.netify_informatics.status_disabled')
          "
        />
      </div>
    </FormLayout>
  </div>
</template>
