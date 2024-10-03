<script setup lang="ts">
import { NeModal } from '@nethesis/vue-components'
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
  if (loading.value) {
    emit('close')
  }
}

async function abortUpdate() {
  loading.value = true
  try {
    if (!_unit.value) {
      error.value = new Error('Unit is not defined.')
      return
    }
    await abortScheduledUpgradeUnitImage(_unit.value)
    await unitsStore.getUnitInfo(_unit.value.id)
    await unitsStore.getUnits()
    notificationStore.addNotification({
      kind: 'success',
      id: 'abort-scheduled-update',
      title: t('controller.units.scheduled_image_update_aborted', {
        name: _unit.value.info.unit_name
      })
    })
    emit('close')
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <NeModal
    :visible="unit != undefined"
    :title="t('controller.units.cancel_scheduled_image_update')"
    :primary-label="t('common.confirm')"
    kind="warning"
    :cancel-label="t('common.close')"
    :primary-button-disabled="loading"
    :primary-button-loading="loading"
    :close-aria-label="t('common.close')"
    @primary-click="abortUpdate"
    @secondary-click="close"
    @close.stop="close"
  >
    {{
      t('controller.units.cancel_scheduled_image_update_description', {
        name: _unit?.info.unit_name
      })
    }}
  </NeModal>
</template>
