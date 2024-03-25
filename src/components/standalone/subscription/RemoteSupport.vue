<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref } from 'vue'
import FormLayout from '../FormLayout.vue'
import { useI18n } from 'vue-i18n'
import {
  NeInlineNotification,
  NeButton,
  NeSkeleton,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { toRefs } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { onMounted } from 'vue'
import NeCopyField from '../NeCopyField.vue'

type DonRequestType = 'start' | 'status' | 'stop'

const { t } = useI18n()

const props = defineProps({
  enableRemoteSupport: {
    type: Boolean,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})
const { enableRemoteSupport, loading } = toRefs(props)

const isLoadingSessionStatus = ref(true)
const error = ref('')
const isProcessingRequest = ref(false)
const sessionId = ref('')

async function startSession() {
  let startDonResponse = await makeDonRequest('start')
  sessionId.value = startDonResponse.data.session_id
}

async function stopSession() {
  await makeDonRequest('stop')
  sessionId.value = ''
}

async function getSessionStatus() {
  isLoadingSessionStatus.value = true
  const statusResponse = await makeDonRequest('status')
  if (statusResponse.data.result === 'no_session') {
    sessionId.value = ''
  } else {
    sessionId.value = statusResponse.data.session_id
  }
  isLoadingSessionStatus.value = false
}

async function makeDonRequest(type: DonRequestType) {
  try {
    error.value = ''
    isProcessingRequest.value = true
    let payload = await ubusCall('ns.don', type)
    return payload
  } catch (e: any) {
    error.value = t(getAxiosErrorMessage(e))
    throw e
  } finally {
    isProcessingRequest.value = false
  }
}

onMounted(() => {
  getSessionStatus()
})
</script>

<template>
  <FormLayout
    :title="t('standalone.subscription.remote_support')"
    :description="t('standalone.subscription.remote_support_description')"
    class="max-w-3xl"
  >
    <NeInlineNotification
      v-if="error"
      kind="error"
      :title="t('error.generic_error')"
      :description="error"
      class="mb-4"
    />
    <NeSkeleton :lines="5" v-if="isLoadingSessionStatus || loading" />
    <template v-else>
      <NeButton
        v-if="!sessionId"
        kind="secondary"
        :disabled="!enableRemoteSupport || isProcessingRequest"
        :loading="isProcessingRequest"
        @click="startSession()"
        >{{ t('standalone.subscription.start_session') }}</NeButton
      >
      <div v-else>
        <!-- Session ID item -->
        <NeCopyField
          :label="t('standalone.subscription.session_id')"
          :value="sessionId"
          :copy-value-label="t('standalone.subscription.copy_id')"
        />

        <div class="mt-6 flex justify-end">
          <NeButton
            kind="primary"
            @click="stopSession()"
            :disabled="isProcessingRequest"
            :loading="isProcessingRequest"
            >{{ t('standalone.subscription.end_session') }}</NeButton
          >
        </div>
      </div>
    </template>
  </FormLayout>
</template>
