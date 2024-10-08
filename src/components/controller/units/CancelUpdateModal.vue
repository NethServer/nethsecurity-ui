<script setup lang="ts">
import { getAxiosErrorMessage, NeInlineNotification, NeModal } from '@nethesis/vue-components'
import { type Unit, useUnitsStore } from '@/stores/controller/units'
import { useI18n } from 'vue-i18n'
import { ref, watch } from 'vue'
import { useUpdates } from '@/composables/useUpdates'
import { useNotificationsStore } from '@/stores/notifications'

const { t } = useI18n()
const { abortScheduledUpgradeUnitImage } = useUpdates()
const unitsStore = useUnitsStore()
const notificationStore = useNotificationsStore()

const props = defineProps<{
  unit?: Unit
}>()

const emit = defineEmits<{
  close: []
}>()

const _unit = ref<Unit>()
const loading = ref(false)
const error = ref<Error>()

watch(
  () => props.unit,
  (unit) => {
    if (unit) {
      _unit.value = unit
    }
  },
  { immediate: true }
)

function close() {
  if (!loading.value) {
    emit('close')
  }
}

async function abortUpdate() {
  error.value = undefined
  if (!_unit.value) {
    error.value = new Error('Unit is not defined.')
    return
  }
  loading.value = true
  try {
    await abortScheduledUpgradeUnitImage(_unit.value)
    await unitsStore.getUnitInfo(_unit.value.id)
    await unitsStore.getUnits()
    notificationStore.createNotification({
      kind: 'success',
      id: 'abort-scheduled-update',
      title: t('controller.units.scheduled_image_update_aborted', {
        name: _unit.value.info.unit_name
      })
    })
    emit('close')
  } catch (reason: any) {
    error.value = reason
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <NeModal
    :visible="unit != undefined"
    :title="t('standalone.update.cancel_update')"
    :primary-label="t('standalone.update.cancel_update')"
    kind="info"
    :cancel-label="t('standalone.update.keep_scheduled_update')"
    :primary-button-disabled="loading"
    :primary-button-loading="loading"
    :close-aria-label="t('standalone.update.keep_scheduled_update')"
    @primary-click="abortUpdate"
    @secondary-click="close"
    @close="close"
  >
    <div class="space-y-4">
      <NeInlineNotification
        v-if="error"
        :description="t(getAxiosErrorMessage(error))"
        :title="t('controller.units.error_removing_scheduled_update')"
        kind="error"
      >
        <template #details>
          {{ error.toString() }}
        </template>
      </NeInlineNotification>
      <p>
        {{
          t('controller.units.cancel_scheduled_image_update_description', {
            version: _unit?.info.version_update,
            name: _unit?.info.unit_name
          })
        }}
      </p>
    </div>
  </NeModal>
</template>
