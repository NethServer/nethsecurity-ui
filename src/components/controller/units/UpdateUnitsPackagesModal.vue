<script lang="ts" setup>
import { type Unit, useUnitsStore } from '@/stores/controller/units'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { type PackageUpdateInfo, useUpdates } from '@/composables/useUpdates'
import { useNotificationsStore } from '@/stores/notifications'
import {
  getAxiosErrorMessage,
  NeInlineNotification,
  NeModal,
  NeSkeleton
} from '@nethesis/vue-components'

const { t } = useI18n()
const { upgradePackages, updatePackageIndex } = useUpdates()
const unitsStore = useUnitsStore()
const notificationStore = useNotificationsStore()

const props = defineProps<{
  unit?: Unit
}>()

const emit = defineEmits<{
  close: []
}>()

const _unit = ref<Unit>()
const fetchingData = ref(false)
const loading = ref(false)
const error = ref<Error>()
const availableUpdates = ref<PackageUpdateInfo[]>([])

watch(
  () => props.unit,
  async (unit) => {
    if (unit) {
      error.value = undefined
      fetchingData.value = true
      _unit.value = unit
      try {
        const response = await updatePackageIndex(_unit.value)
        availableUpdates.value = response.data.updates
        fetchingData.value = false
      } catch (exception: any) {
        error.value = exception
      }
    }
  },
  { immediate: true }
)

const primaryButtonLabel = computed((): string => {
  if (fetchingData.value) {
    return t('common.loading')
  } else if (availableUpdates.value.length > 0) {
    return t('standalone.update.update')
  } else {
    return t('common.close')
  }
})

const modalKind = computed((): string => {
  if (fetchingData.value) {
    return 'neutral'
  } else if (availableUpdates.value.length > 0) {
    return 'info'
  } else {
    return 'success'
  }
})

function close() {
  if (!loading.value) {
    emit('close')
  }
}

async function updateUnitPackages() {
  error.value = undefined
  if (!_unit.value) {
    error.value = new Error('Unit is not defined.')
    return
  }
  if (availableUpdates.value.length <= 0) {
    emit('close')
    return
  }
  try {
    loading.value = true
    await upgradePackages(_unit.value)
    await unitsStore.getUnitInfo(_unit.value.id)
    await unitsStore.getUnits()
    notificationStore.createNotification({
      kind: 'success',
      id: 'update-packages',
      title: t('controller.units.packages_upgrade_in_progress', {
        name: _unit.value.info.unit_name
      })
    })
    unitsStore.addUnitUpdating(_unit.value.id)
    emit('close')
  } catch (exception: any) {
    error.value = exception
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <NeModal
    :visible="unit != undefined"
    :title="t('controller.units.check_packages_updates')"
    :primary-button-disabled="loading || fetchingData"
    :primary-button-loading="loading || fetchingData"
    :cancel-label="availableUpdates.length > 0 ? t('common.cancel') : ''"
    :primary-label="primaryButtonLabel"
    :kind="modalKind"
    :close-aria-label="t('common.close')"
    @primary-click="updateUnitPackages"
    @secondary-click="close"
    @close="close"
  >
    <div class="max-h-96 space-y-3 overflow-y-auto">
      <NeInlineNotification
        v-if="error"
        :description="t(getAxiosErrorMessage(error))"
        :title="t('controller.units.error_upgrading_unit_packages')"
        kind="error"
      >
        <template #details>
          {{ error.toString() }}
        </template>
      </NeInlineNotification>
      <NeSkeleton v-if="fetchingData" :lines="4" />
      <template v-else-if="availableUpdates.length > 0">
        <div class="space-y-2">
          <h6>{{ t('controller.units.packages_to_update') }}</h6>
          <ul>
            <li v-for="update in availableUpdates" :key="update.package">
              {{ update.package }}
              <span class="text-gray-500 dark:text-gray-400">
                {{
                  t('standalone.update.component_update_details', {
                    versionFrom: update.currentVersion,
                    versionTo: update.latestVersion
                  })
                }}
              </span>
            </li>
          </ul>
        </div>
      </template>
      <template v-else>
        {{ t('standalone.update.all_updates_installed_notification') }}
      </template>
    </div>
  </NeModal>
</template>
