<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NeButton, NeSideDrawer, NeTextInput } from '@nethesis/vue-components'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import { MessageBag } from '@/lib/validation'
import { DPI_RULES_KEY, type DpiRule } from '@/composables/useDpiRules'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

const { isShown = false, rule = undefined } = defineProps<{
  isShown?: boolean
  rule?: DpiRule
}>()

const emit = defineEmits<{
  close: []
  renamed: []
}>()

const { t } = useI18n()

const name = ref('')
const validationBag = ref(new MessageBag())

const queryClient = useQueryClient()
const uci = useUciPendingChangesStore()

const { mutate: renameRule, isPending } = useMutation({
  mutationFn: (payload: { id: string; name: string }) =>
    ubusCall<{ data: { message: string } }>('ns.dpi', 'rename-rule', payload),
  onSuccess: () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: DPI_RULES_KEY }), uci.getChanges()])
})

const nameError = computed(() => t(validationBag.value.getFirstI18nKeyFor('name')))

watch(
  () => isShown,
  (shown) => {
    if (shown) {
      name.value = rule?.name ?? ''
      validationBag.value.clear()
    }
  }
)

function close() {
  emit('close')
}

function save() {
  if (!rule) {
    return
  }

  validationBag.value.clear()

  renameRule(
    { id: rule.id, name: name.value.trim() },
    {
      onSuccess: () => emit('renamed'),
      onError: (e: Error) => {
        if (e instanceof ValidationError) {
          validationBag.value = e.errorBag
        }
      }
    }
  )
}
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    :title="t('standalone.dpi.rename_rule')"
    :close-aria-label="t('common.shell.close_side_drawer')"
    @close="close"
  >
    <div class="flex flex-col gap-6">
      <div class="border-b border-gray-200 pb-8 dark:border-gray-700">
        <NeTextInput
          v-model="name"
          :label="t('standalone.dpi.name')"
          :invalid-message="nameError"
          :disabled="isPending"
        />
      </div>
      <div class="flex justify-end gap-6">
        <NeButton kind="tertiary" size="lg" @click="close">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton kind="primary" size="lg" :loading="isPending" :disabled="isPending" @click="save">
          {{ t('common.save') }}
        </NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
