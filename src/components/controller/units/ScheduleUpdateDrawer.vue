<script setup lang="ts">
import {
  getAxiosErrorMessage,
  NeButton,
  NeFormItemLabel,
  NeInlineNotification,
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
import '@vuepic/vue-datepicker/dist/main.css'
import { useThemeStore } from '@/stores/theme'

const { t } = useI18n()
const { checkUnitImageUpdate, upgradeUnitImage, scheduleUpgradeUnitImage } = useUpdates()
const unitsStore = useUnitsStore()

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
  isShown: boolean
  unit?: Unit
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

// Shallow ref to avoid removal of the value when the prop is updated
const _unit = ref<Unit>()
watch(
  () => props.unit,
  (unit) => {
    if (props.isShown && unit !== undefined) {
      _unit.value = unit
      fetchError.value = undefined
      loading.value = true
      checkUnitImageUpdate(_unit.value)
        .then((response) => {
          versionToUpdate.value = response.data.lastVersion
          if (response.data.scheduledAt > 0) {
            scheduledUpdate.value = new Date(response.data.scheduledAt * 1000)
            updateMode.value = 'scheduled'
          }
          loading.value = false
        })
        .catch((error: any) => {
          fetchError.value = error
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
    if (updateMode.value === 'now') {
      await upgradeUnitImage(_unit.value)
    } else {
      await scheduleUpgradeUnitImage(scheduledUpdate.value, _unit.value)
    }
    await unitsStore.getUnitInfo(_unit.value!.id)
    await unitsStore.getUnits()
    emit('success')
  } catch (error: any) {
    sendingError.value = error
  } finally {
    sendingSchedule.value = false
  }
}
</script>

<template>
  <NeSideDrawer
    :isShown="isShown"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    :title="
      updateMode == 'now'
        ? t('standalone.update.update_system')
        : t('standalone.update.schedule_update')
    "
    @close="emit('close')"
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
/* tailwind theme for vue-datepicker */
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
