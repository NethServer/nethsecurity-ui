<script setup lang="ts">
import {
  getAxiosErrorMessage,
  NeButton,
  NeFormItemLabel,
  NeInlineNotification,
  type NeNotification,
  NeRadioSelection,
  NeSideDrawer,
  NeSkeleton,
  NeTextInput,
  NeTooltip
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { type Unit, useUnitsStore } from '@/stores/controller/units'
import { ref, watch } from 'vue'
import { useUpdates } from '@/composables/useUpdates'
import VueDatePicker from '@vuepic/vue-datepicker'
import { useThemeStore } from '@/stores/theme'
import { useNotificationsStore } from '@/stores/notifications'

const { t } = useI18n()
const { checkUnitImageUpdate, upgradeUnitImage, scheduleUpgradeUnitImage } = useUpdates()
const unitsStore = useUnitsStore()
const notificationsStore = useNotificationsStore()

const theme = useThemeStore()

const updateModeOptions = [
  {
    id: 'now',
    label: t('standalone.update.now')
  },
  {
    id: 'scheduled',
    label: t('standalone.update.schedule_time_and_date')
  }
]

const props = defineProps<{
  unit?: Unit
}>()

const emit = defineEmits<{
  close: []
}>()

// Shallow ref to avoid removal of the value when the prop is updated
const _unit = ref<Unit>()
watch(
  () => props.unit,
  (unit) => {
    if (unit) {
      _unit.value = unit
      fetchError.value = undefined
      loading.value = true
      checkUnitImageUpdate(_unit.value)
        .then(async (response) => {
          versionToUpdate.value = response.data.lastVersion
          if (versionToUpdate.value == '') {
            await unitsStore.getUnitInfo(_unit.value!.id)
            await unitsStore.getUnits()
          } else if (response.data.scheduledAt > 0) {
            scheduledUpdate.value = new Date(response.data.scheduledAt * 1000)
            updateMode.value = 'scheduled'
          } else {
            updateMode.value = 'now'
          }
        })
        .catch((error: any) => {
          fetchError.value = error
        })
        .finally(() => {
          loading.value = false
        })
    }
  },
  { immediate: true }
)

const loading = ref(false)
const fetchError = ref<Error>()
const versionToUpdate = ref('')
const scheduledUpdate = ref<Date>(new Date())
const updateMode = ref<'scheduled' | 'now'>('now')
const sendingSchedule = ref(false)
const sendingError = ref<Error>()

async function updateUnit() {
  try {
    sendingSchedule.value = true
    sendingError.value = undefined
    if (updateMode.value == 'now') {
      await upgradeUnitImage(_unit.value)
      unitsStore.addUnitUpgradingImage(_unit.value!.id)
    } else {
      await scheduleUpgradeUnitImage(scheduledUpdate.value, _unit.value)
    }
    await unitsStore.getUnitInfo(_unit.value!.id)
    await unitsStore.getUnits()

    let notification: NeNotification = {
      kind: 'success'
    }
    if (updateMode.value == 'now') {
      notification.id = 'unit-update'
      notification.title = t('controller.units.image_update_success')
      notification.description = t('controller.units.image_update_description')
    } else {
      notification.id = 'schedule-unit-update'
      notification.title = t('controller.units.scheduled_image_update_success')
    }
    notificationsStore.createNotification(notification)
    emit('close')
  } catch (error: any) {
    sendingError.value = error
  } finally {
    sendingSchedule.value = false
  }
}

function close() {
  if (!sendingSchedule.value) {
    emit('close')
  }
}
</script>

<template>
  <NeSideDrawer
    :isShown="unit != undefined"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    :title="t('standalone.update.update_system')"
    @close="close"
  >
    <NeSkeleton v-if="loading" :lines="10" />
    <NeInlineNotification
      v-else-if="fetchError"
      :description="t(getAxiosErrorMessage(fetchError))"
      :title="t('controller.units.error_fetching_unit_image_version')"
      kind="error"
    >
      <template #details>
        {{ fetchError.toString() }}
      </template>
    </NeInlineNotification>
    <div v-else-if="versionToUpdate == ''" class="flex flex-col gap-6">
      <NeInlineNotification :title="t('standalone.update.no_updates_available')" kind="info" />
      <hr />
      <div class="flex flex-wrap justify-end">
        <NeButton kind="primary" @click="emit('close')">{{ t('common.close') }}</NeButton>
      </div>
    </div>
    <div v-else class="flex flex-col gap-6">
      <NeInlineNotification
        v-if="sendingError"
        :description="t(getAxiosErrorMessage(sendingError))"
        :title="t('controller.units.error_setting_image_update')"
        kind="error"
      >
        <template #details>
          {{ sendingError.toString() }}
        </template>
      </NeInlineNotification>
      <NeTextInput
        v-model="versionToUpdate"
        :disabled="true"
        :label="t('standalone.update.update_to_version')"
      />
      <NeRadioSelection
        v-model="updateMode"
        :disabled="sendingSchedule"
        :label="t('standalone.update.choose_when_to_update')"
        :options="updateModeOptions"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.update.schedule_mode_tooltip') }}
            </template>
          </NeTooltip>
        </template>
      </NeRadioSelection>
      <template v-if="updateMode == 'scheduled'">
        <div>
          <NeFormItemLabel class="mb-2">{{ t('standalone.update.time_and_date') }}</NeFormItemLabel>
          <VueDatePicker
            v-model="scheduledUpdate"
            :clearable="false"
            :dark="!theme.isLight"
            :disabled-dates="(date: Date) => date < new Date()"
            :time-picker-inline="true"
            :disabled="sendingSchedule"
            :readonly="sendingSchedule"
          />
        </div>
      </template>
      <hr />
      <div class="flex flex-wrap justify-end gap-4">
        <NeButton
          :disabled="sendingSchedule"
          :readonly="sendingSchedule"
          kind="tertiary"
          @click="emit('close')"
        >
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          :disabled="sendingSchedule"
          :loading="sendingSchedule"
          :readonly="sendingSchedule"
          kind="primary"
          @click="updateUnit"
        >
          <template v-if="updateMode == 'now'">
            {{ t('standalone.update.update_and_reboot') }}
          </template>
          <template v-else>
            {{ t('standalone.update.schedule') }}
          </template>
        </NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>

<style>
@import '@vuepic/vue-datepicker/dist/main.css';

.dp__theme_dark {
  --dp-background-color: rgb(3 7 18 / var(--tw-bg-opacity));
  --dp-primary-color: rgb(6 182 212 / var(--tw-bg-opacity));
  --dp-primary-text-color: rgb(3 7 18 / var(--tw-text-opacity));
  --dp-border-color-hover: var(--dp-primary-color);
}

.dp__theme_light {
  --dp-primary-color: rgb(14 116 144 / var(--tw-bg-opacity));
  --dp-border-color-hover: var(--dp-primary-color);
}
</style>
