<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeInlineNotification,
  NeRadioSelection,
  NeSideDrawer,
  NeTextInput,
  NeToggle,
  getAxiosErrorMessage,
  type RadioOption
} from '@nethesis/vue-components'
import { useMutation } from '@tanstack/vue-query'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import { MessageBag } from '@/lib/validation'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { getListFieldErrorKey, hasUrlCredentials } from '@/composables/useThreatShieldCustomLists'
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
const description = ref('')
const url4 = ref('')
const url6 = ref('')
const chain = ref<BlocklistDirection>('in')
const enabled = ref(true)
const validationBag = ref(new MessageBag())

const chainOptions: RadioOption[] = [
  { id: 'in', label: t('standalone.threat_shield.direction_in') },
  { id: 'out', label: t('standalone.threat_shield.direction_out') },
  { id: 'inout', label: t('standalone.threat_shield.direction_inout') }
]

// url_required is reported on url_4 only, but it is about both fields
const url6ErrorKey = computed(() =>
  validationBag.value.getFirstFor('url_4') === 'url_required'
    ? getListFieldErrorKey(validationBag.value, 'url_4')
    : getListFieldErrorKey(validationBag.value, 'url_6')
)

const { mutate, isPending, error, reset } = useMutation({
  mutationFn: (payload: Record<string, string | boolean>) =>
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
      description.value = itemToEdit?.description ?? ''
      url4.value = itemToEdit?.url_4 ?? ''
      url6.value = itemToEdit?.url_6 ?? ''
      chain.value = itemToEdit?.direction ?? 'in'
      enabled.value = itemToEdit?.enabled ?? true
      validationBag.value.clear()
      reset()
    }
  }
)

// clear a field error as soon as the field changes
watch(name, () => validationBag.value.delete('name'))
watch(description, () => validationBag.value.delete('description'))
watch(chain, () => validationBag.value.delete('chain'))
watch(url4, () => validationBag.value.delete('url_4'))
watch(url6, () => {
  validationBag.value.delete('url_6')
  // url_required is reported on url_4 but is about both URLs
  if (validationBag.value.getFirstFor('url_4') === 'url_required') {
    validationBag.value.delete('url_4')
  }
})

function validate() {
  validationBag.value.clear()
  if (!name.value) {
    validationBag.value.set('name', 'invalid_name')
  }
  if (!url4.value && !url6.value) {
    validationBag.value.set('url_4', 'url_required')
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
      url_4: url4.value,
      url_6: url6.value,
      chain: chain.value,
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
        :placeholder="itemToEdit ? '' : t('common.eg_value', { value: 'badguys' })"
        :helper-text="itemToEdit ? '' : t('standalone.threat_shield.list_name_helper')"
        :invalid-message="t(getListFieldErrorKey(validationBag, 'name'))"
        :readonly="Boolean(itemToEdit)"
        :disabled="isPending"
      />
      <NeTextInput
        v-model="description"
        :label="t('standalone.threat_shield.description')"
        :placeholder="t('standalone.threat_shield.custom_blocklist_description_placeholder')"
        :invalid-message="t(getListFieldErrorKey(validationBag, 'description'))"
        :optional="true"
        :optional-label="t('common.optional')"
        :disabled="isPending"
      />
      <NeRadioSelection
        v-model="chain"
        :label="t('standalone.threat_shield.direction')"
        :options="chainOptions"
        :invalid-message="t(getListFieldErrorKey(validationBag, 'chain'))"
        :disabled="isPending"
      />
      <div class="flex flex-col gap-y-3">
        <NeTextInput
          v-model="url4"
          :label="t('standalone.threat_shield.ipv4_url')"
          :placeholder="t('common.eg_value', { value: 'https://example.com/ipv4.txt' })"
          :helper-text="t('standalone.threat_shield.ipv4_url_helper')"
          :invalid-message="t(getListFieldErrorKey(validationBag, 'url_4'))"
          :disabled="isPending"
        />
        <NeInlineNotification
          v-if="hasUrlCredentials(url4)"
          kind="warning"
          :title="t('standalone.threat_shield.url_credentials_title')"
          :description="t('standalone.threat_shield.url_credentials_description')"
        />
      </div>
      <div class="flex flex-col gap-y-3">
        <NeTextInput
          v-model="url6"
          :label="t('standalone.threat_shield.ipv6_url')"
          :placeholder="t('common.eg_value', { value: 'https://example.com/ipv6.txt' })"
          :helper-text="t('standalone.threat_shield.ipv6_url_helper')"
          :invalid-message="t(url6ErrorKey)"
          :disabled="isPending"
        />
        <NeInlineNotification
          v-if="hasUrlCredentials(url6)"
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
