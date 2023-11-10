<script setup lang="ts">
import {
  NeTitle,
  NeButton,
  NeInlineNotification,
  NeModal,
  NeProgressBar
} from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import FormLayout from '@/components/standalone/FormLayout.vue'
import ScheduleUpdateDrawer from '@/components/standalone/update/ScheduleUpdateDrawer.vue'
import { ref } from 'vue'

const { t } = useI18n()

const updatedAt = new Date().toLocaleString()
const release = 'nethsecurity-22.05.01'

const showBugSecurityFixesModal = ref(false)
const showAllUpdatesInstalledNotification = ref(false)
const showScheduleUpdateDrawer = ref(false)
const securityFixDetails = ref<
  {
    component: string
    fromVersion: string
    toVersion: string
  }[]
>([])
const isUpdating = ref(false)
const newAvailableRelease = ref('nethsecurity-22.05.01')
const scheduledDate = ref(new Date())

async function checkFixes() {
  try {
    showAllUpdatesInstalledNotification.value = false
    //TODO: check fixes
    const newFixesFound = true

    if (newFixesFound) {
      securityFixDetails.value = [
        {
          component: 'ns-api',
          fromVersion: '0.0.12-1',
          toVersion: '0.0.14-1'
        },
        {
          component: 'ns-api-2',
          fromVersion: '0.0.12-1',
          toVersion: '0.0.14-1'
        }
      ]
      showBugSecurityFixesModal.value = true
    } else {
      showAllUpdatesInstalledNotification.value = true
    }
  } catch (err: any) {
    //TODO: error handling
  }
}

async function cancelSchedule() {}

function showEditScheduleDrawer() {
  showScheduleUpdateDrawer.value = true
}
</script>

<template>
  <NeTitle>{{ t('standalone.update.title') }}</NeTitle>
  <FormLayout
    :title="t('standalone.update.bug_security_fixes')"
    :description="t('standalone.update.bug_security_fixes_description')"
    class="max-w-4xl"
  >
    <p class="text-sm text-gray-500 dark:text-gray-400">
      {{ t('standalone.update.updated_at', { updateDate: updatedAt }) }}
    </p>
    <NeButton class="mt-4" @click="checkFixes">
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
      v-if="showAllUpdatesInstalledNotification"
      :description="t('standalone.update.all_updates_installed_notification')"
    />
  </FormLayout>
  <hr />
  <FormLayout class="mt-6 max-w-4xl" :title="t('standalone.update.system_update')">
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
      {{ t('standalone.update.installed_release', { release: release }) }}
    </p>
    <NeInlineNotification
      kind="info"
      class="my-6"
      v-if="scheduledDate"
      :title="t('standalone.update.system_update_scheduled')"
      :description="
        t('standalone.update.system_update_scheduled_description', {
          version: newAvailableRelease,
          date: scheduledDate.toLocaleString()
        })
      "
      :primary-button-label="t('common.edit')"
      :secondary-button-label="t('standalone.update.cancel_update')"
      @secondary-click="cancelSchedule"
      @primary-click="showEditScheduleDrawer"
    />
    <NeInlineNotification
      kind="info"
      class="my-6"
      v-else-if="newAvailableRelease"
      :title="t('standalone.update.available_release')"
      :description="newAvailableRelease"
    />
    <div class="mt-4">
      <NeButton class="mr-4" :disabled="newAvailableRelease == '' || scheduledDate != null"
        ><template #prefix>
          <font-awesome-icon
            :icon="['fas', 'calendar']"
            class="h-4 w-4"
            aria-hidden="true" /></template
        >{{ t('standalone.update.schedule_update') }}</NeButton
      >
      <NeButton kind="tertiary" :disabled="scheduledDate != null"
        ><template #prefix>
          <font-awesome-icon
            :icon="['fas', 'circle-arrow-up']"
            class="h-4 w-4"
            aria-hidden="true" /></template
        >{{ t('standalone.update.upload_image') }}</NeButton
      >
    </div>
  </FormLayout>
  <NeModal
    :visible="showBugSecurityFixesModal"
    kind="info"
    :title="t('standalone.update.bug_security_fixes_to_update')"
    :primary-label="t('standalone.update.title')"
    :primary-button-disabled="isUpdating"
    :primary-button-loading="isUpdating"
    @close="showBugSecurityFixesModal = false"
  >
    <template v-if="!isUpdating"
      ><p v-for="item in securityFixDetails" :key="item.component">
        {{ item.component }}
        <span class="text-gray-500 dark:text-gray-400">{{
          t('standalone.update.component_update_details', {
            versionFrom: item.fromVersion,
            versionTo: item.toVersion
          })
        }}</span>
      </p></template
    >
    <template v-else>
      <p class="text-gray-500 dark:text-gray-400">
        {{ t('standalone.update.update_in_progress_message') }}
      </p>
      <NeProgressBar class="mt-4" :progress="50" />
    </template>
  </NeModal>
  <ScheduleUpdateDrawer
    :is-shown="showScheduleUpdateDrawer"
    @close="showScheduleUpdateDrawer = false"
    :update-version="newAvailableRelease"
    :schedule-to-edit="scheduledDate"
  />
</template>
