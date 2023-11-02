<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { validateFile } from '@/lib/validation'
import {
  NeSideDrawer,
  NeButton,
  NeFileInput,
  NeInlineNotification,
  getAxiosErrorMessage
} from '@nethserver/vue-tailwind-lib'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  isShown: boolean
}>()

const { t } = useI18n()
const importConfigurationError = ref('')
const fileInputValidationError = ref('')
const isImporting = ref(false)

const fileToUpload = ref<File | null>(null)

const emit = defineEmits(['close', 'tunnel-imported'])

function close() {
  importConfigurationError.value = ''
  fileInputValidationError.value = ''
  fileToUpload.value = null
  emit('close')
}

async function importConfiguration() {
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
      importConfigurationError.value = t(
        'standalone.openvpn_tunnel.could_not_parse_configuration_file'
      )
    } else {
      importConfigurationError.value = t(getAxiosErrorMessage(err))
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
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
    :title="t('standalone.openvpn_tunnel.import_configuration')"
  >
    <div class="flex flex-col gap-y-6">
      <NeInlineNotification
        kind="error"
        v-if="importConfigurationError"
        :title="t('error.cannot_import_configuration')"
        :description="importConfigurationError"
      />
      <div>
        <NeFileInput
          :label="`${t('standalone.openvpn_tunnel.nethsecurity_client_configuration')} (*.json)`"
          :invalid-message="fileInputValidationError"
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
