<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAxiosErrorMessage, NeInlineNotification, NeModal } from '@nethesis/vue-components'
import { useDeleteDpiRule, type DpiRule } from '@/composables/useDpiRules'

const { visible = false, rule = undefined } = defineProps<{
  visible?: boolean
  rule?: DpiRule
}>()

const emit = defineEmits<{
  close: []
  deleted: []
}>()

const { t } = useI18n()

const deleteError = ref<Error>()

const { mutate: deleteRule, isPending } = useDeleteDpiRule()

watch(
  () => visible,
  (isShown) => {
    if (isShown) {
      deleteError.value = undefined
    }
  }
)

function confirmDelete() {
  if (!rule) {
    return
  }

  deleteRule(rule.id, {
    onSuccess: () => emit('deleted'),
    onError: (e: Error) => {
      deleteError.value = e
    }
  })
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
      v-if="deleteError"
      kind="error"
      :title="t('error.cannot_delete_rule')"
      :description="t(getAxiosErrorMessage(deleteError))"
      class="mt-4"
    />
  </NeModal>
</template>
