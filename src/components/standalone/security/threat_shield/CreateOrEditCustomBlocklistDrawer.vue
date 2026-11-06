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
  NeRadioSelection,
  NeSideDrawer,
  NeTextInput,
  getAxiosErrorMessage,
  type RadioOption
} from '@nethesis/vue-components'
import { useMutation } from '@tanstack/vue-query'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import { MessageBag } from '@/lib/validation'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import type { Blocklist, BlocklistDirection } from './BlocklistTab.vue'

const { isShown = false, itemToEdit = undefined } = defineProps<{
  isShown?: boolean
  itemToEdit?: Blocklist
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const { t } = useI18n()
const uci = useUciPendingChangesStore()

const name = ref('')
const url4 = ref('')
const url6 = ref('')
const chain = ref<BlocklistDirection>('in')
const description = ref('')
const validationBag = ref(new MessageBag())

const chainOptions: RadioOption[] = [
  { id: 'in', label: t('standalone.threat_shield.direction_in') },
  { id: 'out', label: t('standalone.threat_shield.direction_out') },
  { id: 'inout', label: t('standalone.threat_shield.direction_inout') }
]

const { mutate, isPending, error, reset } = useMutation({
  mutationFn: (payload: Record<string, string>) =>
    ubusCall(
      'ns.threatshield',
      itemToEdit ? 'edit-custom-blocklist' : 'add-custom-blocklist',
      payload
    ),
  onSuccess: () => uci.getChanges()
})

watch(
  () => isShown,
  (shown) => {
    if (shown) {
      name.value = itemToEdit?.name ?? ''
      url4.value = itemToEdit?.url_4 ?? ''
      url6.value = itemToEdit?.url_6 ?? ''
      chain.value = itemToEdit?.direction ?? 'in'
      description.value = itemToEdit?.description ?? ''
      validationBag.value.clear()
      reset()
    }
  }
)

function validate() {
  validationBag.value.clear()
  if (!name.value) {
    validationBag.value.set('name', 'error.required')
  }
  if (!url4.value && !url6.value) {
    validationBag.value.set('url_4', 'error.url_required')
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
      url_4: url4.value,
      url_6: url6.value,
      chain: chain.value,
      description: description.value
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
        ? t('standalone.threat_shield.edit_custom_blocklist')
        : t('standalone.threat_shield.add_custom_blocklist')
    "
    @close="emit('close')"
  >
    <div class="flex flex-col gap-y-6">
      <NeInlineNotification
        v-if="error && !(error instanceof ValidationError)"
        kind="error"
        :title="
          itemToEdit
            ? t('error.cannot_edit_custom_blocklist')
            : t('error.cannot_add_custom_blocklist')
        "
        :description="t(getAxiosErrorMessage(error))"
      />
      <NeInlineNotification
        kind="info"
        :title="t('standalone.threat_shield.remote_list_format')"
        :description="t('standalone.threat_shield.custom_blocklist_format_description')"
      />
      <NeTextInput
        v-model="name"
        :label="t('standalone.threat_shield.name')"
        :helper-text="t('standalone.threat_shield.custom_blocklist_name_helper')"
        :invalid-message="t(validationBag.getFirstI18nKeyFor('name'))"
        :disabled="isPending || Boolean(itemToEdit)"
      />
      <NeTextInput
        v-model="url4"
        :label="t('standalone.threat_shield.ipv4_url')"
        placeholder="https://"
        :invalid-message="t(validationBag.getFirstI18nKeyFor('url_4'))"
        :disabled="isPending"
      />
      <NeTextInput
        v-model="url6"
        :label="t('standalone.threat_shield.ipv6_url')"
        placeholder="https://"
        :invalid-message="t(validationBag.getFirstI18nKeyFor('url_6'))"
        :disabled="isPending"
      />
      <NeRadioSelection
        v-model="chain"
        :label="t('standalone.threat_shield.direction')"
        :options="chainOptions"
        :invalid-message="t(validationBag.getFirstI18nKeyFor('chain'))"
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
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="emit('close')">{{
          t('common.cancel')
        }}</NeButton>
        <NeButton kind="primary" :disabled="isPending" :loading="isPending" @click="save()">{{
          itemToEdit ? t('common.save') : t('standalone.threat_shield.add_custom_blocklist')
        }}</NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
