<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeSideDrawer,
  NeButton,
  NeTooltip,
  NeInlineNotification,
  NeFormItemLabel,
  NeRadioSelection,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { validateFutureDate } from '@/lib/validation'
import { ubusCall } from '@/lib/standalone/ubus'
import VueDatePicker from '@vuepic/vue-datepicker'
import { useThemeStore } from '@/stores/theme'

const props = defineProps<{
  isShown: boolean
  updateVersion: string
  scheduleToEdit: Date | null
}>()

const theme = useThemeStore()

const emit = defineEmits(['close', 'schedule-saved', 'system-update-requested'])

const { t } = useI18n()

const scheduleDateValidationError = ref('')

const isEditing = ref(false)
const versionToUpdate = ref('')
const scheduleMode = ref<'date_time' | 'now'>('now')
const scheduleDate = ref<Date>(new Date())
const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})

const scheduleModeOptions = [
  {
    id: 'now',
    label: t('standalone.update.now')
  },
  {
    id: 'date_time',
    label: t('standalone.update.schedule_time_and_date')
  }
]

const disablePastDates = (date: Date) => {
  const today = new Date()
  return date < today
}

function resetForm() {
  versionToUpdate.value = props.updateVersion
  if (props.scheduleToEdit) {
    isEditing.value = true
    scheduleMode.value = 'date_time'
    scheduleDate.value = props.scheduleToEdit
  } else {
    scheduleMode.value = 'now'
    scheduleDate.value = new Date()
  }
}

function close() {
  error.value = {
    notificationTitle: '',
    notificationDescription: '',
    notificationDetails: ''
  }
  scheduleDateValidationError.value = ''
  emit('close')
}

function validateScheduleDate() {
  const dateValidator = validateFutureDate(scheduleDate.value)

  if (!dateValidator.valid) {
    scheduleDateValidationError.value = t(dateValidator.errMessage as string)
    return false
  }

  return true
}

async function saveScheduleOrBeginUpdate() {
  scheduleDateValidationError.value = ''
  isSavingChanges.value = true
  if (scheduleMode.value == 'date_time') {
    if (!validateScheduleDate()) {
      return
    }

    try {
      await ubusCall('ns.update', 'schedule-system-update', {
        scheduleAt: scheduleDate.value.getTime() / 1000
      })
      emit('schedule-saved')
      close()
    } catch (err: any) {
      error.value.notificationTitle = t('error.cannot_set_update_schedule')
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    }
  } else {
    try {
      await ubusCall('ns.update', 'update-system')
      emit('system-update-requested')
      close()
    } catch (err: any) {
      if (!err.response || !err.response.data) {
        emit('system-update-requested')
        close()
      } else {
        error.value.notificationTitle = t('error.cannot_update_system')
        error.value.notificationDescription = t(getAxiosErrorMessage(err))
        error.value.notificationDetails = err.toString()
      }
    }
  }
  isSavingChanges.value = false
}

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      resetForm()
    }
  }
)
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="close()"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    :title="
      !isEditing ? t('standalone.update.update_system') : t('standalone.update.edit_scheduled_date')
    "
  >
    <NeInlineNotification
      v-if="error.notificationTitle"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
      ><template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <div class="flex flex-col gap-y-6">
      <NeTextInput
        v-model="versionToUpdate"
        :label="t('standalone.update.update_to_version')"
        :disabled="true"
      />
      <NeRadioSelection
        :options="scheduleModeOptions"
        :label="t('standalone.update.choose_when_to_update')"
        v-model="scheduleMode"
        ><template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.update.schedule_mode_tooltip') }}
            </template>
          </NeTooltip>
        </template></NeRadioSelection
      >
      <template v-if="scheduleMode === 'date_time'">
        <div>
          <NeFormItemLabel class="mb-2">{{ t('standalone.update.time_and_date') }}</NeFormItemLabel>
          <div class="flex flex-col">
            <VueDatePicker
              v-model="scheduleDate"
              :time-picker-inline="true"
              :clearable="false"
              :disabled-dates="disablePastDates"
              :dark="!theme.isLight"
              :format="
                (date: Date | null) =>
                  date?.toLocaleString([], {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) ?? ''
              "
            />
            <p
              v-if="scheduleDateValidationError"
              :class="'mt-2 text-sm text-rose-700 dark:text-rose-400'"
            >
              {{ scheduleDateValidationError }}
            </p>
          </div>
        </div>
      </template>
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="saveScheduleOrBeginUpdate()"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{
            scheduleMode === 'now'
              ? t('standalone.update.update_and_reboot')
              : isEditing
              ? t('common.save')
              : t('standalone.update.schedule')
          }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
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
