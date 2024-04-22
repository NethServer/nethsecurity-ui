<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useUnitsStore, type Unit } from '@/stores/controller/units'
import { useNotificationsStore } from '@/stores/notifications'
import {
  NeInlineNotification,
  deleteFromStorage,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { ref, watch, type PropType, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  unit: {
    type: Object as PropType<Unit>,
    default: null
  }
})

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const unitsStore = useUnitsStore()
const notificationsStore = useNotificationsStore()

let loading = ref({
  removeUnit: false
})

let error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})

const unitName = computed(() => {
  return props.unit?.info.unit_name || props.unit?.id
})

watch(
  () => props.visible,
  () => {
    if (props.visible) {
      error.value.notificationTitle = ''
      error.value.notificationDescription = ''
      error.value.notificationDetails = ''
    }
  }
)

async function removeUnit() {
  if (!props.unit) {
    return
  }
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  loading.value.removeUnit = true

  try {
    await unitsStore.removeUnit(props.unit.id)

    // remove unit credentials from local storage
    deleteFromStorage(`unit-${props.unit.id}`)

    emit('close')
    emit('reloadData')

    // show toast notification
    setTimeout(() => {
      notificationsStore.createNotification({
        title: t('controller.units.unit_name_removed', { name: unitName.value }),
        kind: 'success'
      })
    }, 500)
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_remove_unit')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    loading.value.removeUnit = false
  }
}
</script>

<template>
  <NeModal
    :visible="visible"
    :title="t('controller.units.remove_unit')"
    kind="warning"
    :primaryLabel="t('controller.units.remove_unit')"
    :cancelLabel="t('common.cancel')"
    primaryButtonKind="danger"
    :primaryButtonDisabled="loading.removeUnit"
    :primaryButtonLoading="loading.removeUnit"
    :closeAriaLabel="t('common.close')"
    @close="emit('close')"
    @primaryClick="removeUnit"
  >
    {{ t('controller.units.confirm_remove_unit', { name: unitName }) }}
    <NeInlineNotification
      v-if="error.notificationTitle"
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      :closeAriaLabel="t('common.close')"
      class="mt-4"
    >
      <template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template>
    </NeInlineNotification>
  </NeModal>
</template>
