<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import * as v from 'valibot'
import { NeButton, NeSideDrawer, NeTextInput } from '@nethesis/vue-components'
import { ValidationError } from '@/lib/standalone/ubus'
import { MessageBag } from '@/lib/validation'
import { useRenameDpiRule, type DpiRule } from '@/composables/useDpiRules'

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

const { mutate: renameRule, isPending } = useRenameDpiRule()

const schema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'name_required'),
    v.maxLength(64, 'name_too_long')
  )
})

const nameError = computed(() => {
  const message = validationBag.value.getFirstFor('name')
  return message ? t(`standalone.dpi.${message}`) : ''
})

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
  const result = v.safeParse(schema, { name: name.value })
  if (!result.success) {
    for (const issue of result.issues) {
      const field = issue.path?.[0]?.key
      if (typeof field === 'string') {
        validationBag.value.set(field, issue.message)
      }
    }
    return
  }

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
