<script setup lang="ts">
import {
  NeTitle,
  NeButton,
  NeInlineNotification,
  NeModal,
  NeSkeleton,
  getAxiosErrorMessage
} from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import FormLayout from '@/components/standalone/FormLayout.vue'
import ScheduleUpdateDrawer from '@/components/standalone/update/ScheduleUpdateDrawer.vue'
import UploadImageDrawer from '@/components/standalone/update/UploadImageDrawer.vue'
import { ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { computed } from 'vue'
import { onMounted } from 'vue'
import UpdatePackagesModal from '@/components/standalone/update/UpdatePackagesModal.vue'

export type PackageUpdate = {
  package: string
  currentVersion: string
  lastVersion: string
}

export type SystemUpdate = {
  currentVersion: string
  lastVersion: string
  scheduleAt: number
}

const { t } = useI18n()

const loading = ref(true)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const cancelScheduleError = ref({
  notificationDescription: '',
  notificationDetails: ''
})

const lastPackageUpdateCheck = ref<Date | null>(null)
const packageUpdates = ref<PackageUpdate[]>([])
const systemUpdateData = ref<SystemUpdate | null>(null)
const isCheckingPackageUpdates = ref(false)
const isCancellingSchedule = ref(false)
const noPackageUpdatesAvailable = ref(false)

const showScheduleUpdateDrawer = ref(false)
const showUploadImageDrawer = ref(false)
const showConfirmCancelScheduleDrawer = ref(false)

const scheduleDate = computed(() =>
  systemUpdateData.value?.scheduleAt && systemUpdateData.value.scheduleAt != -1
    ? new Date(systemUpdateData.value.scheduleAt * 1000)
    : null
)

async function fetchUpdatesStatus() {
  loading.value = true
  try {
    systemUpdateData.value = (await ubusCall('ns.update', 'check-system-update')).data
    const lastPackageUpdateCheckResponse = (
      await ubusCall('ns.update', 'get-package-updates-last-check')
    ).data
    lastPackageUpdateCheck.value = new Date(lastPackageUpdateCheckResponse.lastCheck * 1000)
    loading.value = false
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_updates_status')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}

async function checkPackageUpdates() {
  try {
    isCheckingPackageUpdates.value = true
    noPackageUpdatesAvailable.value = false
    packageUpdates.value = (await ubusCall('ns.update', 'check-package-updates')).data.updates

    if (packageUpdates.value.length == 0) noPackageUpdatesAvailable.value = true
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_package_updates')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    isCheckingPackageUpdates.value = false
  }
}

async function cancelSchedule() {
  try {
    isCancellingSchedule.value = true
    await ubusCall('ns.update', 'schedule-system-update', { scheduleAt: -1 })
    closeConfirmCancelScheduleModal()
    await fetchUpdatesStatus()
  } catch (err: any) {
    cancelScheduleError.value.notificationDescription = t(getAxiosErrorMessage(err))
    cancelScheduleError.value.notificationDetails = err.toString()
  } finally {
    isCancellingSchedule.value = false
  }
}

function closeConfirmCancelScheduleModal() {
  cancelScheduleError.value.notificationDescription = ''
  cancelScheduleError.value.notificationDetails = ''
  showConfirmCancelScheduleDrawer.value = false
}

function showEditScheduleDrawer() {
  showScheduleUpdateDrawer.value = true
}

onMounted(() => {
  fetchUpdatesStatus()
})
</script>

<template>
  <NeTitle>{{ t('standalone.update.title') }}</NeTitle>
  <NeInlineNotification
    v-if="error.notificationTitle"
    :title="error.notificationTitle"
    :description="error.notificationDescription"
    class="my-4"
    kind="error"
    ><template #details v-if="error.notificationDetails">
      {{ error.notificationDetails }}
    </template></NeInlineNotification
  >
  <NeSkeleton v-if="loading" :lines="10" />
  <template v-else
    ><FormLayout
      :title="t('standalone.update.bug_security_fixes')"
      :description="t('standalone.update.bug_security_fixes_description')"
      class="max-w-4xl"
    >
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{
          t('standalone.update.updated_at', {
            lastCheck: lastPackageUpdateCheck?.toLocaleString()
          })
        }}
      </p>
      <NeButton class="mt-4" @click="checkPackageUpdates">
        <template #prefix>
          <font-awesome-icon
            :icon="['fas', 'arrows-rotate']"
            class="h-4 w-4"
            aria-hidden="true" /></template
        >{{ t('standalone.update.check_for_fixes') }}</NeButton
      >
      <NeInlineNotification
        kind="success"
        class="my-6"
        v-if="noPackageUpdatesAvailable && packageUpdates.length > 0"
        :description="t('standalone.update.all_updates_installed_notification')"
      />
    </FormLayout>
    <hr class="my-6" />
    <FormLayout class="max-w-4xl" :title="t('standalone.update.system_update')">
      <template #description>
        <p class="mb-4 text-sm font-normal text-gray-500 dark:text-gray-400">
          {{ t('standalone.update.system_update_description') }}
        </p>
        <div class="mb-4 flex flex-row items-start gap-x-2">
          <FontAwesomeIcon
            :icon="['fas', 'circle-info']"
            class="h-4 w-4 text-indigo-500 dark:text-indigo-300"
          />
          <p class="text-sm font-normal text-gray-500 dark:text-gray-400">
            {{ t('standalone.update.system_update_first_tip') }}
          </p>
        </div>
        <div class="flex flex-row items-start gap-x-2">
          <FontAwesomeIcon
            :icon="['fas', 'circle-info']"
            class="h-4 w-4 text-indigo-500 dark:text-indigo-300"
          />
          <p class="text-sm font-normal text-gray-500 dark:text-gray-400">
            {{ t('standalone.update.system_update_second_tip') }}
          </p>
        </div>
      </template>

      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{
          t('standalone.update.installed_release', { release: systemUpdateData?.currentVersion })
        }}
      </p>
      <NeInlineNotification
        kind="info"
        class="my-6"
        v-if="scheduleDate && systemUpdateData?.lastVersion"
        :title="t('standalone.update.system_update_scheduled')"
        :description="
          t('standalone.update.system_update_scheduled_description', {
            version: systemUpdateData.lastVersion,
            date: scheduleDate.toLocaleString()
          })
        "
        :primary-button-label="t('common.edit')"
        :secondary-button-label="t('standalone.update.cancel_update')"
        @secondary-click="showConfirmCancelScheduleDrawer = true"
        @primary-click="showEditScheduleDrawer"
      />
      <NeInlineNotification
        kind="info"
        class="my-6"
        v-else-if="systemUpdateData?.lastVersion"
        :title="t('standalone.update.available_release')"
        :description="systemUpdateData.lastVersion"
      />
      <div class="mt-4">
        <NeButton
          class="mr-4"
          v-if="systemUpdateData?.lastVersion && !scheduleDate"
          @click="showEditScheduleDrawer"
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'calendar']"
              class="h-4 w-4"
              aria-hidden="true" /></template
          >{{ t('standalone.update.schedule_update') }}</NeButton
        >
        <NeButton kind="tertiary" v-if="!scheduleDate" @click="showUploadImageDrawer = true"
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'circle-arrow-up']"
              class="h-4 w-4"
              aria-hidden="true" /></template
          >{{ t('standalone.update.upload_image') }}</NeButton
        >
      </div>
    </FormLayout></template
  >

  <!-- Confirm cancel schedule modal -->
  <NeModal
    :visible="showConfirmCancelScheduleDrawer"
    kind="info"
    :title="t('standalone.update.cancel_update')"
    :primary-label="t('standalone.update.cancel_update')"
    :cancel-label="t('standalone.update.keep_scheduled_update')"
    :primary-button-disabled="isCancellingSchedule"
    :primary-button-loading="isCancellingSchedule"
    @primary-click="cancelSchedule"
    @close="!isCancellingSchedule ? closeConfirmCancelScheduleModal() : undefined"
  >
    <p>
      {{
        t('standalone.update.cancel_update_description', { version: systemUpdateData?.lastVersion })
      }}
    </p>
    <NeInlineNotification
      v-if="cancelScheduleError.notificationDescription"
      :title="t('error.cannot_cancel_schedule')"
      :description="cancelScheduleError.notificationDescription"
      kind="error"
      class="my-6"
    >
      <template #details v-if="cancelScheduleError.notificationDetails">
        {{ cancelScheduleError.notificationDetails }}
      </template>
    </NeInlineNotification>
  </NeModal>

  <UpdatePackagesModal
    :package-updates="packageUpdates"
    @close="packageUpdates = []"
    @packages-updated="fetchUpdatesStatus"
  />
  <ScheduleUpdateDrawer
    :is-shown="showScheduleUpdateDrawer"
    @close="showScheduleUpdateDrawer = false"
    :update-version="systemUpdateData?.lastVersion ?? ''"
    :schedule-to-edit="scheduleDate"
    @schedule-saved="fetchUpdatesStatus"
  />
  <UploadImageDrawer :is-shown="showUploadImageDrawer" @close="showUploadImageDrawer = false" />
</template>
