<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { validateFile } from '@/lib/validation'
import {
  NeFileInput,
  NeSideDrawer,
  NeButton,
  NeInlineNotification,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getProductName } from '@/lib/config'

defineProps<{
  isShown: boolean
}>()

const { t } = useI18n()
const importConfigurationError = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const fileInputValidationError = ref('')
const isImporting = ref(false)

const fileToUpload = ref<File | null>(null)

const emit = defineEmits(['close', 'tunnel-imported'])

function close() {
  importConfigurationError.value.notificationDescription = ''
  importConfigurationError.value.notificationDetails = ''
  fileInputValidationError.value = ''
  fileToUpload.value = null
  emit('close')
}

async function importConfiguration() {
  importConfigurationError.value.notificationDescription = ''
  importConfigurationError.value.notificationDetails = ''
  const fileValidation = validateFile(fileToUpload.value, 'json')
  if (!fileValidation.valid) {
    fileInputValidationError.value = t(fileValidation.errMessage as string)
    return
  }

  try {
    isImporting.value = true
    const jsonPayload = await fileToUpload.value?.text()
    await ubusCall('ns.ovpntunnel', 'import-client', JSON.parse(jsonPayload ?? '{}'))
    emit('tunnel-imported')
    close()
  } catch (err: any) {
    if (err instanceof SyntaxError) {
      // JSON file parsing failed
      importConfigurationError.value.notificationDescription = t(
        'standalone.openvpn_tunnel.could_not_parse_configuration_file'
      )
    } else {
      importConfigurationError.value.notificationDescription = t(getAxiosErrorMessage(err))
      importConfigurationError.value.notificationDetails = err.toString()
    }
  } finally {
    isImporting.value = false
  }
}
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="close()"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    :title="t('standalone.openvpn_tunnel.import_configuration')"
  >
    <div class="flex flex-col gap-y-6">
      <NeInlineNotification
        kind="error"
        v-if="importConfigurationError.notificationDescription"
        :title="t('error.cannot_import_configuration')"
        :description="importConfigurationError.notificationDescription"
        ><template v-if="importConfigurationError.notificationDetails" #details>
          {{ importConfigurationError.notificationDetails }}
        </template></NeInlineNotification
      >
      <div>
        <NeFileInput
          :label="`${t('standalone.openvpn_tunnel.nethsecurity_client_configuration', {
            product: getProductName()
          })} (*.json)`"
          :invalid-message="fileInputValidationError"
          :dropzoneLabel="t('ne_file_input.dropzone_label')"
          v-model="fileToUpload"
        />
      </div>
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="importConfiguration()"
          :disabled="isImporting"
          :loading="isImporting"
          >{{ t('standalone.openvpn_tunnel.import') }}</NeButton
        >
      </div>
    </div>
  </NeSideDrawer>
</template>
