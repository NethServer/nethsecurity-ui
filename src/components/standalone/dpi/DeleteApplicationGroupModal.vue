<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAxiosErrorMessage, NeInlineNotification, NeModal } from '@nethesis/vue-components'
import { ValidationError } from '@/lib/standalone/ubus'
import {
  useDeleteApplicationGroup,
  type DpiApplicationGroup
} from '@/composables/useApplicationGroups'

const { visible = false, group = undefined } = defineProps<{
  visible?: boolean
  group?: DpiApplicationGroup
}>()

const emit = defineEmits<{
  close: []
  deleted: []
}>()

const { t } = useI18n()

const deleteError = ref<Error>()
const validationMessage = ref('')

const { mutate: deleteGroup, isPending } = useDeleteApplicationGroup()

function clearErrors() {
  deleteError.value = undefined
  validationMessage.value = ''
}

watch(
  () => visible,
  (isShown) => {
    if (isShown) {
      clearErrors()
    }
  }
)

function onDeleteError(e: Error) {
  if (e instanceof ValidationError && e.errorBag.has('id')) {
    validationMessage.value = t(e.errorBag.getFirstI18nKeyFor('id'))
  } else {
    deleteError.value = e
  }
}

function confirmDelete() {
  if (!group) {
    return
  }

  clearErrors()
  deleteGroup(group.id, {
    onSuccess: () => emit('deleted'),
    onError: onDeleteError
  })
}
</script>

<template>
  <NeModal
    :visible="visible"
    kind="warning"
    :title="t('standalone.dpi.delete_application_group')"
    :primary-label="t('common.delete')"
    :cancel-label="t('common.cancel')"
    primary-button-kind="danger"
    :primary-button-disabled="isPending"
    :primary-button-loading="isPending"
    :close-aria-label="t('common.close')"
    @close="emit('close')"
    @primary-click="confirmDelete"
  >
    {{ t('standalone.dpi.confirm_delete_application_group', { name: group?.name ?? '' }) }}
    <NeInlineNotification
      v-if="validationMessage"
      kind="error"
      :title="t('error.cannot_delete_application_group')"
      :description="validationMessage"
      class="mt-4"
    />
    <NeInlineNotification
      v-if="deleteError"
      kind="error"
      :title="t('error.cannot_delete_application_group')"
      :description="t(getAxiosErrorMessage(deleteError))"
      class="mt-4"
    />
  </NeModal>
</template>
