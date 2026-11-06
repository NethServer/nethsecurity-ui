<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeInlineNotification,
  NeSideDrawer,
  NeTextInput,
  NeToggle,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import { MessageBag } from '@/lib/validation'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { ALLOWLIST_URLS_KEY, type AllowlistUrl } from '@/composables/useThreatShieldCustomLists'

const { isShown = false, itemToEdit = undefined } = defineProps<{
  isShown?: boolean
  itemToEdit?: AllowlistUrl
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const { t } = useI18n()
const queryClient = useQueryClient()
const uci = useUciPendingChangesStore()

const url = ref('')
const description = ref('')
const enabled = ref(true)
const validationBag = ref(new MessageBag())

const { mutate, isPending, error, reset } = useMutation({
  mutationFn: (payload: Omit<AllowlistUrl, 'builtin' | 'id'> & { id?: string }) =>
    ubusCall('ns.threatshield', payload.id ? 'edit-allowlist-url' : 'add-allowlist-url', payload),
  onSuccess: () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: ALLOWLIST_URLS_KEY }), uci.getChanges()])
})

watch(
  () => isShown,
  (shown) => {
    if (shown) {
      url.value = itemToEdit?.url ?? ''
      description.value = itemToEdit?.description ?? ''
      enabled.value = itemToEdit?.enabled ?? true
      validationBag.value.clear()
      reset()
    }
  }
)

function validate() {
  validationBag.value.clear()
  if (!url.value) {
    validationBag.value.set('url', 'error.required')
  }
  return validationBag.value.size == 0
}

function save() {
  if (!validate()) {
    return
  }
  mutate(
    {
      id: itemToEdit?.id,
      url: url.value,
      description: description.value,
      enabled: enabled.value
    },
    {
      onSuccess: () => {
        emit('saved')
        emit('close')
      },
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
    :close-aria-label="t('common.shell.close_side_drawer')"
    :title="
      itemToEdit
        ? t('standalone.threat_shield.edit_allowlist_url')
        : t('standalone.threat_shield.add_allowlist_url')
    "
    @close="emit('close')"
  >
    <div class="flex flex-col gap-y-6">
      <NeInlineNotification
        v-if="error && !(error instanceof ValidationError)"
        kind="error"
        :title="
          itemToEdit ? t('error.cannot_edit_allowlist_url') : t('error.cannot_add_allowlist_url')
        "
        :description="t(getAxiosErrorMessage(error))"
      />
      <NeInlineNotification
        v-else-if="validationBag.has('id')"
        kind="error"
        :title="t('error.cannot_edit_allowlist_url')"
        :description="t(validationBag.getFirstI18nKeyFor('id'))"
      />
      <NeInlineNotification
        kind="info"
        :title="t('standalone.threat_shield.remote_list_format')"
        :description="t('standalone.threat_shield.allowlist_url_format_description')"
      />
      <NeTextInput
        v-model="url"
        :label="t('standalone.threat_shield.url')"
        placeholder="https://"
        :invalid-message="t(validationBag.getFirstI18nKeyFor('url'))"
        :disabled="isPending"
      />
      <NeTextInput
        v-model="description"
        :label="t('standalone.threat_shield.description')"
        :invalid-message="t(validationBag.getFirstI18nKeyFor('description'))"
        :optional="true"
        :optional-label="t('common.optional')"
        :disabled="isPending"
      />
      <NeToggle
        v-model="enabled"
        :top-label="t('common.status')"
        :label="enabled ? t('common.enabled') : t('common.disabled')"
        :disabled="isPending"
      />
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="emit('close')">{{
          t('common.cancel')
        }}</NeButton>
        <NeButton kind="primary" :disabled="isPending" :loading="isPending" @click="save()">{{
          itemToEdit ? t('common.save') : t('standalone.threat_shield.add_allowlist_url')
        }}</NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
