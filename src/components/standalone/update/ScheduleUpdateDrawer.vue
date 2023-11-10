<script setup lang="ts">
import {
  NeSideDrawer,
  NeRadioSelection,
  NeFormItemLabel,
  NeTextInput,
  NeButton
} from '@nethserver/vue-tailwind-lib'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { MessageBag } from '@/lib/validation'

const props = defineProps<{
  isShown: boolean
  updateVersion: string
  scheduleToEdit: Date | null
}>()

const emit = defineEmits(['close', 'schedule-saved'])

const { t } = useI18n()

const validationErrorBag = ref(new MessageBag())

const isEditing = ref(false)
const versionToUpdate = ref('')
const scheduleMode = ref<'date_time' | 'now'>('date_time')
const time = ref('')
const date = ref('')
const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})

const scheduleModeOptions = [
  {
    id: 'date_time',
    label: t('standalone.update.schedule_time_and_date')
  },
  {
    id: 'now',
    label: t('standalone.update.now')
  }
]

function resetForm() {
  versionToUpdate.value = props.updateVersion
  scheduleMode.value = 'date_time'
  if (props.scheduleToEdit) {
    date.value = props.scheduleToEdit.toISOString().split('T')[0]
    time.value = props.scheduleToEdit.toLocaleTimeString('en', {
      timeStyle: 'short',
      hour12: false,
      timeZone: 'UTC'
    })
  }
}

function close() {
  error.value = {
    notificationTitle: '',
    notificationDescription: '',
    notificationDetails: ''
  }
  emit('close')
}

async function saveSchedule() {}

watch(
  () => props.isShown,
  () => {
    if (props.isShown) resetForm()
  }
)
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="close()"
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
    :title="t('standalone.update.schedule_update')"
  >
    <NeInlineNotification
      v-if="error.notificationTitle"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
    />
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
          <div class="flex flex-row gap-x-4">
            <!-- TODO: replace with NeTextInput -->
            <input type="date" v-model="date" class="flex-grow" />
            <input type="time" v-model="time" class="flex-grow" />
          </div>
        </div>
      </template>
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="saveSchedule()"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{ t('standalone.update.schedule') }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
</template>
