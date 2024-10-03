<script lang="ts" setup>
import { type Unit, useUnitsStore } from '@/stores/controller/units'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUpdates } from '@/composables/useUpdates'
import { useNotificationsStore } from '@/stores/notifications'
import { getAxiosErrorMessage, NeModal, NeInlineNotification } from '@nethesis/vue-components'

const { t } = useI18n()
const { upgradePackages } = useUpdates()
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

async function updateUnitPackages() {
  if (!_unit.value) {
    error.value = new Error('Unit is not defined.')
    return
  }
  try {
    error.value = undefined
    loading.value = true
    await upgradePackages(_unit.value)
    await unitsStore.getUnitInfo(_unit.value.id)
    await unitsStore.getUnits()
    notificationStore.addNotification({
      kind: 'success',
      id: 'update-packages',
      title: t('controller.units.packages_upgrade_in_progress', {
        name: _unit.value.info.unit_name
      })
    })
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
    :title="t('controller.units.upgrade_unit_packages')"
    :primary-label="t('common.confirm')"
    kind="warning"
    :cancel-label="t('common.close')"
    :primary-button-disabled="loading"
    :primary-button-loading="loading"
    :close-aria-label="t('common.close')"
    @primary-click="updateUnitPackages"
    @secondary-click="close"
    @close="close"
  >
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
    {{
      t('controller.units.upgrade_unit_packages_description', {
        name: _unit?.info.unit_name
      })
    }}
  </NeModal>
</template>
