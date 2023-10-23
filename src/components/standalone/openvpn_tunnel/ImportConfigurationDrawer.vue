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
        <NeFormItemLabel>{{
          `${t('standalone.openvpn_tunnel.nethsecurity_client_configuration')} (*.json)`
        }}</NeFormItemLabel>
        <NeFileInput v-if="!fileToUpload" v-model="fileToUpload" />
        <NeCard v-else>
          <div class="flex flex-row items-center">
            <font-awesome-icon :icon="['fas', 'file']" class="mr-4 h-6 w-6" aria-hidden="true" />
            <div class="mr-auto">
              <p class="text-sm font-semibold">{{ fileToUpload.name }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ fileToUpload.size / 1000 }} KB
              </p>
            </div>
            <NeButton @click="fileToUpload = undefined" kind="tertiary" class="self-stretch"
              ><font-awesome-icon :icon="['fas', 'xmark']" class="h-4 w-4" aria-hidden="true"
            /></NeButton>
          </div>
        </NeCard>
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
