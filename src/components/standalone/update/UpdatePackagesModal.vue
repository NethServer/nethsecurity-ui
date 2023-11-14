<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import type { PackageUpdate } from '@/views/standalone/system/UpdateView.vue'
import {
  getAxiosErrorMessage,
  NeModal,
  NeInlineNotification,
  NeProgressBar
} from '@nethserver/vue-tailwind-lib'
import { onUnmounted } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const UPDATE_WAIT_TIME = 20000

defineProps<{
  packageUpdates: PackageUpdate[]
}>()

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})

const emit = defineEmits(['close', 'packages-updated'])

const { t } = useI18n()

const isSubmittingUpdateRequest = ref(false)
const isUpdatingPackages = ref(false)
const updateProgress = ref(0)
const updateTimerRef = ref<number | undefined>()
const updateIntervalRef = ref<number | undefined>()

function close() {
  isUpdatingPackages.value = false
  updateProgress.value = 0
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  emit('close')
}

async function updatePackages() {
  try {
    isSubmittingUpdateRequest.value = true
    await ubusCall('ns.update', 'install-package-updates')
    isUpdatingPackages.value = true
    setUpdateTimer()
  } catch (err: any) {
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    isSubmittingUpdateRequest.value = false
  }
}

function clearTimers() {
  if (updateTimerRef.value) clearTimeout(updateTimerRef.value)
  if (updateIntervalRef.value) clearInterval(updateIntervalRef.value)
}

function setUpdateTimer() {
  updateTimerRef.value = setTimeout(() => {
    emit('packages-updated')
    clearTimers()
    close()
  }, UPDATE_WAIT_TIME)

  updateIntervalRef.value = setInterval(() => {
    updateProgress.value += 0.5
  }, UPDATE_WAIT_TIME / 200)
}

onUnmounted(() => {
  clearTimers()
})
</script>

<template>
  <NeModal
    :visible="packageUpdates.length > 0"
    kind="info"
    :title="t('standalone.update.bug_security_fixes_to_update')"
    :primary-label="t('standalone.update.title')"
    :primary-button-disabled="isUpdatingPackages"
    :primary-button-loading="isUpdatingPackages"
    :cancel-label="!isUpdatingPackages ? t('common.cancel') : ''"
    @close="!isUpdatingPackages ? close() : undefined"
    @primary-click="updatePackages"
  >
    <template v-if="!isUpdatingPackages"
      ><p v-for="item in packageUpdates" :key="item.package">
        {{ item.package }}
        <span class="text-gray-500 dark:text-gray-400">{{
          t('standalone.update.component_update_details', {
            versionFrom: item.currentVersion,
            versionTo: item.lastVersion
          })
        }}</span>
      </p>
      <NeInlineNotification
        v-if="error.notificationDescription"
        :title="t('error.cannot_update_packages')"
        :description="error.notificationDescription"
        class="my-6"
        kind="error"
        ><template #details v-if="error.notificationDetails">
          {{ error.notificationDetails }}
        </template></NeInlineNotification
      ></template
    >
    <template v-else>
      <p>
        {{ t('standalone.update.update_in_progress_message') }}
      </p>
      <NeProgressBar class="mt-4" :progress="updateProgress" />
    </template>
  </NeModal>
</template>
