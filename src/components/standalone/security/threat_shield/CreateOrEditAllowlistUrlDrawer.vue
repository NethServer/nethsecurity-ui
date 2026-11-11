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
import {
  ALLOWLIST_URLS_KEY,
  getListFieldErrorKey,
  hasUrlCredentials,
  type AllowlistUrl
} from '@/composables/useThreatShieldCustomLists'

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

const name = ref('')
const description = ref('')
const url = ref('')
const enabled = ref(true)
const validationBag = ref(new MessageBag())

const { mutate, isPending, error, reset } = useMutation({
  mutationFn: (payload: Omit<AllowlistUrl, 'builtin'>) =>
    ubusCall('ns.threatshield', itemToEdit ? 'edit-allowlist-url' : 'add-allowlist-url', payload),
  onSuccess: () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: ALLOWLIST_URLS_KEY }), uci.getChanges()])
})

watch(
  () => isShown,
  (shown) => {
    if (shown) {
      name.value = itemToEdit?.name ?? ''
      description.value = itemToEdit?.description ?? ''
      url.value = itemToEdit?.url ?? ''
      enabled.value = itemToEdit?.enabled ?? true
      validationBag.value.clear()
      reset()
    }
  }
)

// clear a field error as soon as the field changes
watch(name, () => validationBag.value.delete('name'))
watch(description, () => validationBag.value.delete('description'))
watch(url, () => validationBag.value.delete('url'))

function validate() {
  validationBag.value.clear()
  if (!name.value) {
    validationBag.value.set('name', 'invalid_name')
  }
  if (!url.value) {
    validationBag.value.set('url', 'required')
  }
  return validationBag.value.size == 0
}

function save() {
  if (!validate()) {
    return
  }
  mutate(
    {
      name: name.value,
      description: description.value,
      url: url.value,
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
        ? t('standalone.threat_shield.edit_custom_feed')
        : t('standalone.threat_shield.create_custom_feed')
    "
    @close="emit('close')"
  >
    <div class="flex flex-col gap-y-6">
      <NeInlineNotification
        v-if="error && !(error instanceof ValidationError)"
        kind="error"
        :title="
          itemToEdit ? t('error.cannot_edit_custom_feed') : t('error.cannot_create_custom_feed')
        "
        :description="t(getAxiosErrorMessage(error))"
      />
      <NeToggle
        v-model="enabled"
        :top-label="t('common.status')"
        :label="enabled ? t('common.enabled') : t('common.disabled')"
        :disabled="isPending"
      />
      <NeTextInput
        v-model="name"
        :label="t('standalone.threat_shield.name')"
        :placeholder="itemToEdit ? '' : t('common.eg_value', { value: 'partners' })"
        :helper-text="itemToEdit ? '' : t('standalone.threat_shield.list_name_helper')"
        :invalid-message="t(getListFieldErrorKey(validationBag, 'name'))"
        :readonly="Boolean(itemToEdit)"
        :disabled="isPending"
      />
      <NeTextInput
        v-model="description"
        :label="t('standalone.threat_shield.description')"
        :placeholder="t('standalone.threat_shield.custom_allowlist_description_placeholder')"
        :invalid-message="t(getListFieldErrorKey(validationBag, 'description'))"
        :optional="true"
        :optional-label="t('common.optional')"
        :disabled="isPending"
      />
      <div class="flex flex-col gap-y-3">
        <NeTextInput
          v-model="url"
          :label="t('standalone.threat_shield.list_url')"
          :placeholder="t('common.eg_value', { value: 'https://example.com/allowlist.txt' })"
          :helper-text="t('standalone.threat_shield.list_url_helper')"
          :invalid-message="t(getListFieldErrorKey(validationBag, 'url'))"
          :disabled="isPending"
        />
        <NeInlineNotification
          v-if="hasUrlCredentials(url)"
          kind="warning"
          :title="t('standalone.threat_shield.url_credentials_title')"
          :description="t('standalone.threat_shield.url_credentials_description')"
        />
      </div>
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="emit('close')">{{
          t('common.cancel')
        }}</NeButton>
        <NeButton kind="primary" :disabled="isPending" :loading="isPending" @click="save()">{{
          itemToEdit ? t('common.save') : t('common.create')
        }}</NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
