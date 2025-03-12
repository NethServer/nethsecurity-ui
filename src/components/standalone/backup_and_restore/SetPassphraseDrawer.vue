<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  getAxiosErrorMessage,
  NeButton,
  NeInlineNotification,
  NeSideDrawer,
  NeSkeleton,
  NeTextInput,
  NeTooltip
} from '@nethesis/vue-components'
import { isAxiosError } from 'axios'
import { useBackupsStore } from '@/stores/standalone/backups.ts'
import { MessageBag, validateRequired } from '@/lib/validation.ts'

const { t } = useI18n()
const backup = useBackupsStore()

const props = defineProps({
  showPassphraseDrawer: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['success', 'close'])

watch(
  () => props.showPassphraseDrawer,
  () => {
    error.value = undefined
    passphrase.value = ''
  }
)

const title = computed((): string => {
  if (backup.isPassPhraseSet) {
    return t('standalone.backup_and_restore.backup.edit_passphrase')
  } else {
    return t('standalone.backup_and_restore.backup.configure_passphrase')
  }
})

const label = computed((): string => {
  if (backup.isPassPhraseSet) {
    return t('standalone.backup_and_restore.backup.new_passphrase')
  } else {
    return t('standalone.backup_and_restore.backup.passphrase')
  }
})

const passphrase = ref('')
const error = ref<Error>()
const loading = ref(false)
const validation = ref(new MessageBag())

function validate(): boolean {
  validation.value.clear()
  const { valid, errMessage } = validateRequired(passphrase.value)
  if (!valid) {
    validation.value.set('passphrase', errMessage as string)
  }
  return validation.value.size == 0
}

async function setPassphrase() {
  if (validate()) {
    loading.value = true
    error.value = undefined
    ubusCall('ns.backup', 'set-passphrase', {
      passphrase: passphrase.value
    })
      .then(() => {
        backup.isPassPhraseSet = true
        emit('success')
      })
      .catch((exception: Error) => {
        error.value = exception
      })
      .finally(() => {
        loading.value = false
      })
  }
}
</script>

<template>
  <NeSideDrawer :is-shown="showPassphraseDrawer" :title="title" @close="$emit('close')">
    <NeSkeleton v-if="backup.loading" :lines="10" />
    <form class="space-y-8" @submit.prevent="setPassphrase">
      <NeInlineNotification
        v-if="error != undefined"
        :description="t(getAxiosErrorMessage(error))"
        :title="t('error.cannot_set_passphrase')"
        kind="error"
      >
        <template v-if="!isAxiosError(error)" #details>
          {{ error.toString() }}
        </template>
      </NeInlineNotification>
      <input autocomplete="username" hidden name="username" value="firewall-backup-password" />
      <NeTextInput
        ref="passphrase-field"
        v-model="passphrase"
        :invalid-message="t(validation.getFirstI18nKeyFor('passphrase'))"
        is-password
        :label="label"
        autocomplete="new-password"
        required
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
        v-if="backup.isPassPhraseSet"
        :description="
          t(
            'standalone.backup_and_restore.backup.changing_your_passphrase_applies_to_new_backups_description'
          )
        "
        :title="t('standalone.backup_and_restore.backup.passphrase_update_applies_to_new_backups')"
        kind="info"
      />
      <NeInlineNotification
        v-else
        :description="
          t('standalone.backup_and_restore.backup.passphrase_required_for_restore_description')
        "
        :title="t('standalone.backup_and_restore.backup.passphrase_required_for_restore')"
        kind="info"
      />

      <hr />
      <div class="flex justify-end gap-4">
        <NeButton :disabled="loading" :kind="'tertiary'" @click="$emit('close')">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton :disabled="loading" :kind="'primary'" :loading="loading" type="submit">
          <template v-if="backup.isPassPhraseSet">
            {{ t('common.save') }}
          </template>
          <template v-else>
            {{ t('common.configure') }}
          </template>
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
