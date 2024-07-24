<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeInlineNotification,
  NeButton,
  NeSideDrawer,
  NeTooltip,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { AxiosError } from 'axios'

const { t } = useI18n()

const props = defineProps({
  showPassphraseDrawer: {
    type: Boolean,
    required: true
  },
  isSetPassphrase: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['success', 'close'])

watch(
  () => props.showPassphraseDrawer,
  () => {
    errorSetPassphrase.value = {
      notificationTitle: '',
      notificationDescription: '',
      notificationDetails: ''
    }
  }
)

const formPassphrase = ref({
  passphrase: ''
})

const loading = ref(false)

let errorSetPassphrase = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})

async function setPassphrase() {
  loading.value = true

  let payload = {
    passphrase: formPassphrase.value.passphrase
  }

  ubusCall('ns.backup', 'set-passphrase', payload)
    .then((response) => {
      if (response?.data?.message && response.data.message == 'success') {
        emit('success')
      }
    })
    .catch((exception: AxiosError) => {
      errorSetPassphrase.value.notificationTitle = t('error.cannot_set_passphrase')
      errorSetPassphrase.value.notificationDescription = t(getAxiosErrorMessage(exception))
      errorSetPassphrase.value.notificationDetails = exception.toString()
    })
    .finally(() => {
      loading.value = false
      formPassphrase.value.passphrase = ''
    })
}
</script>

<template>
  <NeSideDrawer
    :is-shown="showPassphraseDrawer"
    :title="t('standalone.backup_and_restore.backup.passphrase_drawer_title')"
    @close="$emit('close')"
  >
    <div class="space-y-8">
      <NeTextInput
        v-model="formPassphrase.passphrase"
        :label="t('standalone.backup_and_restore.backup.passphrase')"
        isPassword
        :helperText="t('standalone.backup_and_restore.backup.passphrase_reser_helper')"
        :placeholder="isSetPassphrase ? t('standalone.backup_and_restore.backup.unchanged') : ''"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.backup_and_restore.backup.passphrase_helper') }}
            </template>
          </NeTooltip>
        </template>
      </NeTextInput>
      <NeInlineNotification
        v-if="errorSetPassphrase.notificationTitle"
        class="my-4"
        kind="error"
        :title="errorSetPassphrase.notificationTitle"
        :description="errorSetPassphrase.notificationDescription"
      >
        <template v-if="errorSetPassphrase.notificationDetails" #details>
          {{ errorSetPassphrase.notificationDetails }}
        </template>
      </NeInlineNotification>
      <hr />
      <div class="flex justify-end gap-4">
        <NeButton :disabled="loading" :kind="'tertiary'" @click="$emit('close')">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton :disabled="loading" :kind="'primary'" :loading="loading" @click="setPassphrase()">
          {{ t('common.configure') }}
        </NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
