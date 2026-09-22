<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAxiosErrorMessage, NeInlineNotification, NeModal } from '@nethesis/vue-components'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import {
  APPLICATION_GROUPS_KEY,
  type DpiApplicationGroup
} from '@/composables/useApplicationGroups'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

const { visible = false, group = undefined } = defineProps<{
  visible?: boolean
  group?: DpiApplicationGroup
}>()

const emit = defineEmits<{
  close: []
  deleted: []
}>()

const { t } = useI18n()

const queryClient = useQueryClient()
const uci = useUciPendingChangesStore()

const {
  mutate: deleteGroup,
  isPending,
  error,
  reset
} = useMutation({
  mutationFn: (id: string) =>
    ubusCall<{ data: { message: string } }>('ns.dpi', 'delete-appgroup', { id }),
  onSettled: () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: APPLICATION_GROUPS_KEY }),
      uci.getChanges()
    ])
})

const validationMessage = computed(() =>
  error.value instanceof ValidationError && error.value.errorBag.has('id')
    ? t(error.value.errorBag.getFirstI18nKeyFor('id'))
    : ''
)

watch(
  () => visible,
  (isShown) => {
    if (isShown) {
      reset()
    }
  }
)

function confirmDelete() {
  if (!group) {
    return
  }

  deleteGroup(group.id, { onSuccess: () => emit('deleted') })
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
      v-if="error && !validationMessage"
      kind="error"
      :title="t('error.cannot_delete_application_group')"
      :description="t(getAxiosErrorMessage(error))"
      class="mt-4"
    />
  </NeModal>
</template>
