<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeSideDrawer,
  NeButton,
  NeFileInput,
  NeInlineNotification,
  NeFormItemLabel,
  getAxiosErrorMessage,
  NeCard
} from '@nethserver/vue-tailwind-lib'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  isShown: boolean
}>()

const { t } = useI18n()
const error = ref('')
const isImporting = ref(false)

const fileToUpload = ref<File>()

const emit = defineEmits(['close', 'tunnel-imported'])

function close() {
  error.value = ''
  fileToUpload.value = undefined
  emit('close')
}

async function importConfiguration() {
  try {
    isImporting.value = true
    const jsonPayload = await fileToUpload.value?.text()
    await ubusCall('ns.ovpntunnel', 'import-client', JSON.parse(jsonPayload ?? '{}'))
    emit('tunnel-imported')
    close()
  } catch (err: any) {
    if (err instanceof SyntaxError) {
      // JSON file parsing failed
      error.value = t('standalone.openvpn_tunnel.could_not_parse_configuration_file')
    } else {
      error.value = t(getAxiosErrorMessage(err))
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
        v-if="error"
        :title="t('error.cannot_import_configuration')"
        :description="error"
      />
      <div>
        <NeFileInput
          :label="`${t('standalone.openvpn_tunnel.nethsecurity_client_configuration')} (*.json)`"
          v-model="fileToUpload"
        />
      </div>
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="importConfiguration()"
          :disabled="isImporting || !fileToUpload"
          :loading="isImporting"
          >{{ t('standalone.openvpn_tunnel.import') }}</NeButton
        >
      </div>
    </div>
  </NeSideDrawer>
</template>
