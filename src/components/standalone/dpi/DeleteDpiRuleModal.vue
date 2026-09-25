<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAxiosErrorMessage, NeInlineNotification, NeModal } from '@nethesis/vue-components'
import { DPI_RULES_KEY, type DpiRule } from '@/composables/useDpiRules'
import { ubusCall } from '@/lib/standalone/ubus'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

const { visible = false, rule = undefined } = defineProps<{
  visible?: boolean
  rule?: DpiRule
}>()

const emit = defineEmits<{
  close: []
  deleted: []
}>()

const { t } = useI18n()

const queryClient = useQueryClient()
const uci = useUciPendingChangesStore()

const {
  mutate: deleteRule,
  isPending,
  error,
  reset
} = useMutation({
  mutationFn: (id: string) =>
    ubusCall<{ data: { message: string } }>('ns.dpi', 'delete-rule', { id }),
  onSuccess: () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: DPI_RULES_KEY }), uci.getChanges()])
})

watch(
  () => visible,
  (isShown) => {
    if (isShown) {
      reset()
    }
  }
)

function confirmDelete() {
  if (!rule) {
    return
  }

  deleteRule(rule.id, { onSuccess: () => emit('deleted') })
}
</script>

<template>
  <NeModal
    :visible="visible"
    kind="warning"
    :title="t('standalone.dpi.delete_rule')"
    :primary-label="t('common.delete')"
    :cancel-label="t('common.cancel')"
    primary-button-kind="danger"
    :primary-button-loading="isPending"
    :primary-button-disabled="isPending"
    :close-aria-label="t('common.close')"
    @close="emit('close')"
    @primary-click="confirmDelete"
  >
    {{ t('standalone.dpi.confirm_delete_rule', { name: rule?.name ?? '' }) }}
    <NeInlineNotification
      v-if="error"
      kind="error"
      :title="t('error.cannot_delete_rule')"
      :description="t(getAxiosErrorMessage(error))"
      class="mt-4"
    />
  </NeModal>
</template>
