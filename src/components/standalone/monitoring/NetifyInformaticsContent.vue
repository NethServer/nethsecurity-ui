<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { useNotificationsStore } from '@/stores/notifications'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
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

interface ErrorObject {
  notificationTitle: string
  notificationDescription: string
  uuid: string
}
const objError: ErrorObject = {
  notificationTitle: '',
  notificationDescription: '',
  uuid: ''
}

let isError = ref(false)
let loading = ref(false)
let saving = ref(false)
let uuidRef = ref()
let JustCopied = ref(false)

const error: Ref<ErrorObject> = ref({ ...objError })
const errorLoadingConfiguration: Ref<ErrorObject> = ref({ ...objError })
const errorSaving: Ref<ErrorObject> = ref({ ...objError })

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
      loading.value = false
    }
  } catch (exception: any) {
    isError.value = true
    errorLoadingConfiguration.value.notificationTitle = t(
      'error.cannot_retrieve_netify_informatics_configuration'
    )
    errorLoadingConfiguration.value.notificationDescription = t(getAxiosErrorMessage(exception))
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

function open_dashboard() {
  window.open('https://portal.netify.ai/login', '_blank')
}
function copy_uuid() {
  navigator.clipboard.writeText(form.value.uuid)
  JustCopied.value = true
  setTimeout(() => {
    JustCopied.value = false
  }, 3000)
}
</script>

<template>
  <div>
    <FormLayout class="max-w-6xl">
      <template #description>
        <i18n-t keypath="standalone.netify_informatics.content_description" tag="p" scope="global">
        </i18n-t>
        <NeButton kind="tertiary" size="lg" @click="open_dashboard()" class="ml-2 shrink-0">
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'arrow-up-right-from-square']" aria-hidden="true" />
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
          <NeButton kind="tertiary" size="sm" @click="copy_uuid" class="ml-2.5 mt-8">
            <template #prefix>
              <font-awesome-icon :icon="['fas', 'copy']" class="h-4 w-4" aria-hidden="true" />
            </template>
            {{ t('standalone.netify_informatics.copy') }}
          </NeButton>
          <NeBadge
            class="ml-2.5 mt-8"
            v-if="JustCopied"
            :icon="['fas', 'check']"
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
