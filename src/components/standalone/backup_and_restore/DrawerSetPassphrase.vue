<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  getAxiosErrorMessage,
  NeButton,
  NeInlineNotification,
  NeSideDrawer,
  NeTextInput,
  NeTitle,
  NeTooltip
} from '@nethserver/vue-tailwind-lib'
import { AxiosError } from 'axios'

const { t } = useI18n()

const props = defineProps({
  showPassphraseDrawer: {
    type: Boolean,
    required: true
  },
  unitName: {
    type: String
  }
})

const emit = defineEmits(['success', 'close'])

watch(
  () => props.showPassphraseDrawer,
  () => {
    errorSetPassphrase.value = {
      notificationTitle: '',
      notificationDescription: '',
      passphrase: ''
    }
  }
)

const formPassphrase = ref({
  passphrase: ''
})

let loadingSetPassphrase = ref(false)
let passphraseRef = ref()

let objNotification = {
  notificationTitle: '',
  notificationDescription: '',
  passphrase: ''
}

let errorSetPassphrase = ref({ ...objNotification })

async function setPassphrase() {
  loadingSetPassphrase.value = true

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
    })
    .finally(() => {
      loadingSetPassphrase.value = false
    })
}
</script>

<template>
  <NeSideDrawer :is-shown="showPassphraseDrawer" title="" @close="$emit('close')">
    <div class="space-y-8">
      <NeTitle>{{ t('standalone.backup_and_restore.backup.passphrase_drawer_title') }}</NeTitle>
      <hr />
      <NeTextInput
        v-model="formPassphrase.passphrase"
        :invalid-message="errorSetPassphrase.passphrase"
        :label="t('standalone.backup_and_restore.backup.passphrase')"
        isPassword
        ref="passphraseRef"
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
      />
      <hr />
      <div class="flex justify-end gap-4">
        <NeButton :disabled="loadingSetPassphrase" :kind="'tertiary'" @click="$emit('close')">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          :disabled="loadingSetPassphrase"
          :kind="'primary'"
          :loading="loadingSetPassphrase"
          @click="setPassphrase()"
        >
          {{ t('common.configure') }}
        </NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
