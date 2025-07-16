<script lang="ts" setup>
import {
  focusElement,
  NeButton,
  NeCombobox,
  type NeComboboxOption,
  NeFormItemLabel,
  NeInlineNotification,
  NeRadioSelection,
  NeSideDrawer,
  NeTooltip
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { useUnitsStore } from '@/stores/controller/units'
import { computed, ref } from 'vue'
import { MessageBag } from '@/lib/validation'
import VueDatePicker from '@vuepic/vue-datepicker'
import { useThemeStore } from '@/stores/theme'
import { useUpdates } from '@/composables/useUpdates'
import { useNotificationsStore } from '@/stores/notifications'

const { t } = useI18n()
const unitsStore = useUnitsStore()
const theme = useThemeStore()
const { upgradeUnitImage, scheduleUpgradeUnitImage } = useUpdates()
const notificationsStore = useNotificationsStore()

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

function close() {
  if (!loading.value) {
    emit('close')
  }
}

function validate(): boolean {
  errorBag.value.clear()

  if (selectedUnits.value.length < 1) {
    errorBag.value.set('units', 'error.required_option')
    focusElement(selectedUnitsRef.value)
  }

  return errorBag.value.size > 0
}

function updateUnits() {
  if (validate()) {
    return
  }
  loading.value = true
  someUnitsFailed.value = false
  Promise.allSettled(
    selectedUnits.value.map((unitOption: NeComboboxOption) => {
      const unit = unitsStore.units.find((u) => u.id === unitOption.id)
      if (!unit) {
        return Promise.reject(new Error(`Unit with id ${unitOption.id} not found`))
      }

      if (updateMode.value === 'now') {
        return upgradeUnitImage(unit).then(() => {
          unitsStore.addUnitUpgradingImage(unit.id)
        })
      } else {
        return scheduleUpgradeUnitImage(scheduledUpdate.value, unit)
      }
    })
  )
    .then(async (results: PromiseSettledResult<any>[]) => {
      // load again the info of the units
      for (const unit of selectedUnits.value) {
        await unitsStore.getUnitInfo(unit.id)
      }
      await unitsStore.getUnits()
      // clean selection
      selectedUnits.value = []
      // if some units failed to update, prompt the user to check again
      // the selection is cleaned every choice
      if (results.some((result) => result.status === 'rejected')) {
        // count the failed units
        someUnitsFailed.value = true
      } else {
        // all good, close the drawer and show a success notification
        emit('close')
        updateMode.value = 'now'
        notificationsStore.createNotification({
          title: t(
            'controller.units.batch_updated_systems',
            results.filter((result) => result.status === 'fulfilled').length
          ),
          kind: 'success'
        })
      }
    })
    .finally(() => {
      loading.value = false
    })
}

const unitsAvailableForUpdate = computed((): NeComboboxOption[] => {
  return unitsStore.units
    .filter(
      // if a unit is connected, and does not have a scheduled update and have a new image available
      (unit) => unit.connected && unit.info?.scheduled_update < 0 && unit.info?.version_update != ''
    )
    .map((unit) => {
      return {
        id: unit.id,
        label: unit.info?.unit_name || unit.id,
        description: unit.info?.unit_name ? unit.id : ''
      }
    })
})

function selectAllUnits() {
  selectedUnits.value = unitsAvailableForUpdate.value
}

function deselectAllUnits() {
  selectedUnits.value = []
}

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

const allUnitsSelected = computed(() => {
  return selectedUnits.value.length === unitsAvailableForUpdate.value.length
})

const selectedUnits = ref<NeComboboxOption[]>([])
const loading = ref(false)
const scheduledUpdate = ref<Date>(new Date())
const updateMode = ref<'scheduled' | 'now'>('now')
const errorBag = ref(new MessageBag())
const selectedUnitsRef = ref()
const someUnitsFailed = ref(false)
</script>

<template>
  <NeSideDrawer
    :close-aria-label="t('common.shell.close_side_drawer')"
    :is-shown="show"
    :title="t('standalone.update.update_system', 2)"
    @close="close"
  >
    <div class="space-y-4">
      <NeInlineNotification
        :close-aria-label="t('common.close')"
        :description="t('controller.units.batch_update_system')"
        :show-details-label="t('notifications.show_details')"
        :title="t('standalone.update.update_system', 2)"
        kind="info"
      />
      <NeInlineNotification
        v-if="someUnitsFailed"
        :description="t('controller.units.error_batch_updating_systems_description')"
        :title="t('controller.units.error_batch_updating_systems')"
        kind="warning"
      />
      <NeButton v-if="allUnitsSelected" class="-mx-2" kind="tertiary" @click="deselectAllUnits">
        {{ t('controller.units.deselect_all_units') }}
      </NeButton>
      <NeButton v-else class="-mx-2" kind="tertiary" @click="selectAllUnits">
        {{ t('controller.units.select_all_units') }}
      </NeButton>
      <NeCombobox
        ref="selectedUnitsRef"
        v-model="selectedUnits"
        :disabled="loading"
        :invalid-message="t(errorBag.getFirstI18nKeyFor('units'))"
        :label="t('controller.units.units')"
        :limited-options-label="t('ne_combobox.limited_options_label')"
        :no-options-label="t('controller.units.no_unit_is_currently_connected')"
        :no-results-label="t('ne_combobox.no_results')"
        :optional-label="t('common.optional')"
        :options="unitsAvailableForUpdate"
        :placeholder="t('ne_combobox.choose_multiple')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
        multiple
      />
      <NeRadioSelection
        v-model="updateMode"
        :disabled="loading"
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
            :disabled="loading"
            :disabled-dates="(date: Date) => date < new Date()"
            :readonly="loading"
            :time-picker-inline="true"
          />
        </div>
      </template>
      <hr />
      <div class="flex flex-wrap justify-end gap-4">
        <NeButton :disabled="loading" :readonly="loading" kind="tertiary" @click="emit('close')">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          :disabled="loading"
          :loading="loading"
          :readonly="loading"
          kind="primary"
          @click="updateUnits"
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
