<script setup lang="ts">
import { ref } from 'vue'
import FormLayout from '../FormLayout.vue'
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeSkeleton,
  getAxiosErrorMessage,
  NeInlineNotification
} from '@nethserver/vue-tailwind-lib'
import { toRefs } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { onMounted } from 'vue'

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

function copySessionId() {
  navigator.clipboard.writeText(sessionId.value)
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
        <p class="mb-2 text-sm font-medium leading-6 text-gray-700 dark:text-gray-200">
          {{ t('standalone.subscription.session_id') }}
        </p>
        <div
          class="text-md flex flex-row rounded-md border border-gray-300 bg-white text-gray-700 transition-colors duration-200 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-200 sm:text-sm sm:leading-6"
        >
          <div class="mt-0 flex-grow px-3 py-1.5">
            {{ sessionId }}
          </div>
          <button
            class="rounded-r-md bg-gray-50 px-3 py-1.5 duration-200 hover:bg-gray-200 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white focus:duration-0 dark:bg-gray-950 dark:hover:bg-gray-800 dark:focus:ring-primary-300 dark:focus:ring-offset-primary-950"
            @click="copySessionId()"
          >
            <font-awesome-icon :icon="['fas', 'clone']" aria-hidden="true" class="mr-2 h-4 w-4" />
            {{ t('standalone.subscription.copy_id') }}
          </button>
        </div>

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
