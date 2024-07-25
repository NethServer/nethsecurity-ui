<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  // title of the modal, e.g. "Delete user"
  title: {
    type: String,
    required: true
  },
  // label of the delete button, e.g. "Delete user"
  deleteButtonLabel: {
    type: String,
    required: true
  },
  // title of the error notification, e.g. "Cannot delete user"
  errorNotificationTitle: {
    type: String,
    required: true
  },
  deleteFunction: {
    type: Function as PropType<() => Promise<any>>,
    required: true
  }
})

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()

let loading = ref({
  delete: false
})

let error = ref({
  delete: '',
  deleteDetails: ''
})

watch(
  () => props.visible,
  () => {
    if (props.visible) {
      error.value.delete = ''
      error.value.deleteDetails = ''
    }
  }
)

async function doDelete() {
  error.value.delete = ''
  error.value.deleteDetails = ''
  loading.value.delete = true

  try {
    await props.deleteFunction()
    emit('close')
    emit('reloadData')
  } catch (err: any) {
    console.error(err)
    error.value.delete = t(getAxiosErrorMessage(err))
    error.value.deleteDetails = err.toString()
  } finally {
    loading.value.delete = false
  }
}
</script>

<template>
  <NeModal
    :visible="visible"
    :title="title"
    kind="warning"
    :primaryLabel="deleteButtonLabel"
    :cancelLabel="t('common.cancel')"
    primaryButtonKind="danger"
    :primaryButtonDisabled="loading.delete"
    :primaryButtonLoading="loading.delete"
    :closeAriaLabel="t('common.close')"
    @close="emit('close')"
    @primaryClick="doDelete"
  >
    <slot></slot>
    <NeInlineNotification
      v-if="error.delete"
      kind="error"
      :title="errorNotificationTitle"
      :description="error.delete"
      class="mt-4"
    >
      <template #details v-if="error.deleteDetails">
        {{ error.deleteDetails }}
      </template>
    </NeInlineNotification>
  </NeModal>
</template>
