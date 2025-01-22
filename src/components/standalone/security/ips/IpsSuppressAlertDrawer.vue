<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  getAxiosErrorMessage,
  NeButton,
  NeInlineNotification,
  NeRadioSelection,
  NeSideDrawer,
  NeTextInput
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { ref, watchEffect } from 'vue'
import { MessageBag } from '@/lib/validation'
import type {
  Direction,
  SuppressedAlert
} from '@/components/standalone/security/ips/IpsSuppressedAlerts.vue'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'

const { t } = useI18n()

const { visible, alert } = defineProps<{
  visible: boolean
  alert?: SuppressedAlert
}>()

const emit = defineEmits(['close', 'suppress'])

// FIXME: export the type from the library
type RadioOption = {
  label: string
  id: Direction
}

const directionOptions: RadioOption[] = [
  { label: t('standalone.ips.source'), id: 'by_src' },
  { label: t('standalone.ips.destination'), id: 'by_dst' }
]

watchEffect(() => {
  if (visible) {
    gid.value = alert?.gid ?? ''
    sid.value = alert?.sid ?? ''
    direction.value = alert?.direction ?? 'by_src'
    ip.value = alert?.ip ?? ''
    description.value = alert?.description ?? ''
  }
})

const loading = ref(false)
const error = ref<Error>()
const validationErrors = ref(new MessageBag())
const gid = ref('')
const sid = ref('')
const direction = ref<Direction>('by_src')
const ip = ref('')
const description = ref('')

function closeHandler() {
  if (!loading.value) {
    emit('close')
  }
}

function suppressAlert() {
  loading.value = true
  error.value = undefined
  validationErrors.value.clear()
  ubusCall('ns.snort', 'suppress-alert', {
    gid: gid.value,
    sid: sid.value,
    direction: direction.value,
    ip: ip.value,
    description: description.value
  })
    .then(() => {
      emit('suppress')
    })
    .catch((reason: Error) => {
      if (reason instanceof ValidationError) {
        validationErrors.value = reason.errorBag
      } else {
        error.value = reason
      }
    })
    .finally(() => {
      loading.value = false
    })
}
</script>

<template>
  <NeSideDrawer
    :is-shown="visible"
    :title="t('standalone.ips.add_suppressed_alert')"
    @close="closeHandler"
  >
    <form class="space-y-8" @submit.prevent="suppressAlert()">
      <NeInlineNotification
        v-if="error"
        :description="t(getAxiosErrorMessage(error))"
        :title="t('standalone.ips.error_suppressing_alert')"
        kind="error"
      />
      <NeTextInput
        v-model="gid"
        :disabled="loading || alert != undefined"
        :label="t('standalone.ips.gid_label')"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('gid'))"
        required
        type="number"
      />
      <NeTextInput
        v-model="sid"
        :disabled="loading || alert != undefined"
        :label="t('standalone.ips.sid_label')"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('sid'))"
        required
        type="number"
      />
      <NeRadioSelection
        v-model="direction"
        :disabled="loading || alert != undefined"
        :label="t('standalone.ips.direction')"
        :options="directionOptions"
      />
      <NeTextInput
        v-model="ip"
        :disabled="loading || alert != undefined"
        :label="t('standalone.ips.address')"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('ip'))"
        :helper-text="t('standalone.ips.address_helper')"
        required
      />
      <NeTextInput
        v-model="description"
        :disabled="loading"
        :label="t('standalone.ips.description')"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('description'))"
      />
      <hr />
      <div class="flex flex-wrap justify-end gap-6">
        <NeButton :disabled="loading" kind="tertiary" size="lg" @click="closeHandler">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton :disabled="loading" :loading="loading" kind="primary" size="lg" type="submit">
          {{ t('standalone.ips.add_suppressed_alert') }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
