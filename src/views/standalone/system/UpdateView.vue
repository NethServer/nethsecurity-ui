<script setup lang="ts">
import {
  getAxiosErrorMessage,
  NeButton,
  NeHeading,
  NeInlineNotification,
  NeLink,
  NeModal,
  NeSkeleton,
  NeToggle,
  NeTooltip
} from '@nethesis/vue-components'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useI18n } from 'vue-i18n'
import FormLayout from '@/components/standalone/FormLayout.vue'
import ScheduleUpdateDrawer from '@/components/standalone/update/ScheduleUpdateDrawer.vue'
import UploadImageDrawer from '@/components/standalone/update/UploadImageDrawer.vue'
import { computed, onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import UpdatePackagesModal from '@/components/standalone/update/UpdatePackagesModal.vue'
import SystemUpdateInProgressModal from '@/components/standalone/update/SystemUpdateInProgressModal.vue'
import { getProductName } from '@/lib/config'
import { useNotificationsStore } from '@/stores/notifications'
import { useRouter } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

export type PackageUpdate = {
  package: string
  currentVersion: string
  latestVersion: string
}

export type SystemUpdate = {
  currentVersion: string
  lastVersion: string
  scheduledAt: number
}

const { t } = useI18n()
const notificationsStore = useNotificationsStore()
const router = useRouter()

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

const disableRemoteUpdates = ref(false)

const lastPackageUpdateCheck = ref<Date | null>(null)
const packageUpdates = ref<PackageUpdate[]>([])
const systemUpdateData = ref<SystemUpdate | null>(null)
const isCheckingPackageUpdates = ref(false)
const isCancellingSchedule = ref(false)
const isApplyingSystemUpdate = ref(false)
const noPackageUpdatesAvailable = ref(false)

const automaticUpdatesEnabled = ref(false)
const isSubscriptionActive = ref(false)
const isChangingAutomaticUpdatesSetting = ref(false)

const showScheduleUpdateDrawer = ref(false)
const showUploadImageDrawer = ref(false)
const showConfirmCancelScheduleDrawer = ref(false)

const scheduleDate = computed(() =>
  systemUpdateData.value?.scheduledAt && systemUpdateData.value.scheduledAt != -1
    ? new Date(systemUpdateData.value.scheduledAt * 1000)
    : null
)

function cleanError() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
}

async function fetchUpdatesStatus() {
  cleanError()
  loading.value = true
  disableRemoteUpdates.value = false
  try {
    const lastPackageUpdateCheckResponse = (
      await ubusCall('ns.update', 'get-package-updates-last-check')
    ).data
    if (lastPackageUpdateCheckResponse.lastCheck > 0) {
      lastPackageUpdateCheck.value = new Date(lastPackageUpdateCheckResponse.lastCheck * 1000)
    }

    const subscriptionResponse = await ubusCall('ns.subscription', 'info')
    isSubscriptionActive.value =
      subscriptionResponse.data.systemd_id != '' && subscriptionResponse.data.active

    automaticUpdatesEnabled.value = (
      await ubusCall('ns.update', 'get-automatic-updates-status')
    ).data.enabled

    systemUpdateData.value = (await ubusCall('ns.update', 'check-system-update')).data
  } catch (err: any) {
    disableRemoteUpdates.value = true
    switch (err.response?.data?.message) {
      case 'connection_error':
        error.value.notificationTitle = t('standalone.update.connection_error')
        error.value.notificationDescription = t('standalone.update.connection_error_description')
        break
      case 'maintenance':
        error.value.notificationTitle = t('standalone.update.maintenance')
        error.value.notificationDescription = t('standalone.update.maintenance_description')
        break
      case 'unauthorized':
        error.value.notificationTitle = t('standalone.update.unauthorized')
        error.value.notificationDescription = t('standalone.update.unauthorized_description')
        break
      case 'server_error':
        error.value.notificationTitle = t('standalone.update.server_error')
        error.value.notificationDescription = t('standalone.update.server_error_description')
        break
      case 'repository_url_not_set':
        error.value.notificationTitle = t('standalone.update.repository_url_not_set')
        error.value.notificationDescription = t(
          'standalone.update.repository_url_not_set_description'
        )
        break
      default:
        error.value.notificationTitle = t('standalone.update.generic_error')
        error.value.notificationDescription = t('standalone.update.generic_error_description')
        error.value.notificationDetails = err.toString()
    }
  } finally {
    loading.value = false
  }
}

async function handleAutomaticUpdatesToggle(value: boolean) {
  cleanError()
  try {
    isChangingAutomaticUpdatesSetting.value = true
    await ubusCall('ns.update', 'set-automatic-updates', { enable: value })
    notificationsStore.addNotification({
      id: value ? 'enable-automatic-updates' : 'disable-automatic-updates',
      kind: 'success',
      title: t(
        value
          ? 'standalone.update.automatic_updates_enabled_message'
          : 'standalone.update.automatic_updates_disabled_message'
      )
    })
  } catch (err: any) {
    error.value.notificationTitle = value
      ? t('error.cannot_enable_automatic_updates')
      : t('error.cannot_disable_automatic_updates')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    automaticUpdatesEnabled.value = !value
  } finally {
    isChangingAutomaticUpdatesSetting.value = false
  }
}

async function checkPackageUpdates() {
  cleanError()
  try {
    isCheckingPackageUpdates.value = true
    noPackageUpdatesAvailable.value = false
    packageUpdates.value = (await ubusCall('ns.update', 'check-package-updates')).data.updates

    if (packageUpdates.value.length == 0) {
      noPackageUpdatesAvailable.value = true
    }
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
  <NeHeading tag="h3" class="mb-7">{{ t('standalone.update.title') }}</NeHeading>
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

  <FormLayout
    :title="t('standalone.update.bug_security_fixes')"
    :description="t('standalone.update.bug_security_fixes_description')"
    class="max-w-4xl"
  >
    <NeSkeleton v-if="loading" :lines="5" />
    <template v-else
      ><p class="mb-4 text-sm text-gray-500 dark:text-gray-400" v-if="lastPackageUpdateCheck">
        {{
          t('standalone.update.updated_at', {
            lastCheck: lastPackageUpdateCheck.toLocaleString([], {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          })
        }}
      </p>
      <NeButton
        @click="checkPackageUpdates"
        :disabled="isCheckingPackageUpdates || disableRemoteUpdates"
        :loading="isCheckingPackageUpdates"
      >
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
        v-if="noPackageUpdatesAvailable"
        :description="t('standalone.update.all_updates_installed_notification')"
      />
      <div class="mt-6">
        <NeToggle
          v-model="automaticUpdatesEnabled"
          :disabled="!isSubscriptionActive || isChangingAutomaticUpdatesSetting"
          @update:model-value="handleAutomaticUpdatesToggle"
          :label="automaticUpdatesEnabled ? t('common.enabled') : t('common.disabled')"
          :top-label="t('standalone.update.automatic_updates')"
        >
          <template #topTooltip>
            <NeTooltip>
              <template #content>
                <p>
                  {{ t('standalone.update.automatic_updates_tooltip') }}
                </p>
                <NeLink
                  invertedTheme
                  @click="
                    () => {
                      router.push(`${getStandaloneRoutePrefix()}/system/subscription`)
                    }
                  "
                  >{{ t('standalone.update.go_to_subscription') }}</NeLink
                >
              </template>
            </NeTooltip>
          </template>
        </NeToggle>
      </div>
    </template>
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
          {{ t('standalone.update.system_update_first_tip', { productName: getProductName() }) }}
        </p>
      </div>
      <div class="mb-4 flex flex-row items-start gap-x-2">
        <FontAwesomeIcon
          :icon="['fas', 'circle-info']"
          class="h-4 w-4 text-indigo-500 dark:text-indigo-300"
        />
        <p class="text-sm font-normal text-gray-500 dark:text-gray-400">
          {{ t('standalone.update.system_update_second_tip') }}
        </p>
      </div>
    </template>

    <NeSkeleton v-if="loading" :lines="5" />
    <template v-else>
      <p v-if="systemUpdateData?.currentVersion" class="text-sm text-gray-500 dark:text-gray-400">
        {{ t('standalone.update.installed_release', { release: systemUpdateData.currentVersion }) }}
      </p>
      <NeInlineNotification
        kind="info"
        class="my-6"
        v-if="scheduleDate"
        :title="t('standalone.update.system_update_scheduled')"
        :description="
          t('standalone.update.system_update_scheduled_description', {
            version: systemUpdateData?.lastVersion,
            date: scheduleDate.toLocaleString([], {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
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
        v-else-if="
          systemUpdateData?.lastVersion &&
          systemUpdateData.lastVersion != systemUpdateData?.currentVersion
        "
        :title="t('standalone.update.new_release_available')"
        :description="systemUpdateData?.lastVersion"
      />
      <div class="mt-4">
        <NeButton
          kind="primary"
          class="mb-2 mr-4"
          v-if="
            systemUpdateData?.lastVersion &&
            systemUpdateData.lastVersion != systemUpdateData?.currentVersion &&
            !scheduleDate
          "
          :disabled="disableRemoteUpdates"
          @click="showEditScheduleDrawer"
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'arrows-rotate']"
              class="h-4 w-4"
              aria-hidden="true" /></template
          >{{ t('standalone.update.update_system') }}</NeButton
        >
        <NeButton kind="tertiary" v-if="!scheduleDate" @click="showUploadImageDrawer = true"
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'circle-arrow-up']"
              class="h-4 w-4"
              aria-hidden="true" /></template
          >{{ t('standalone.update.update_with_image_file') }}</NeButton
        >
      </div>
    </template>
  </FormLayout>

  <!-- Confirm cancel schedule modal -->
  <NeModal
    :visible="showConfirmCancelScheduleDrawer"
    kind="info"
    :title="t('standalone.update.cancel_update')"
    :primary-label="t('standalone.update.cancel_update')"
    :cancel-label="t('standalone.update.keep_scheduled_update')"
    :primary-button-disabled="isCancellingSchedule"
    :primary-button-loading="isCancellingSchedule"
    :close-aria-label="t('common.close')"
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
    @system-update-requested="isApplyingSystemUpdate = true"
  />
  <UploadImageDrawer
    :is-shown="showUploadImageDrawer"
    @close="showUploadImageDrawer = false"
    @update-requested="isApplyingSystemUpdate = true"
  />
  <SystemUpdateInProgressModal :visible="isApplyingSystemUpdate" />
</template>
