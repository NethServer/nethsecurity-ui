<script lang="ts" setup>
import { NeModal, NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus.ts'

const { t } = useI18n()

const emit = defineEmits(['success'])

const { visible = false } = defineProps<{
  visible: boolean
}>()

const loading = ref(false)
const error = ref<Error>()

function deletePassphrase() {
  loading.value = true
  error.value = undefined

  ubusCall('ns.backup', 'set-passphrase', { passphrase: '' })
    .then(() => {
      emit('success')
    })
    .catch((reason) => (error.value = reason))
    .finally(() => (loading.value = false))
}
</script>

<template>
  <NeModal
    :close-aria-label="t('common.close')"
    :primary-button-disabled="loading"
    :primary-button-loading="loading"
    :primary-label="t('common.confirm')"
    :title="t('standalone.backup_and_restore.backup.remove_passphrase_title')"
    :visible="visible"
    primary-button-kind="danger"
    @primary-click="deletePassphrase"
  >
    <NeInlineNotification
      v-if="error"
      :description="t(getAxiosErrorMessage(error))"
      :title="t('error.generic_error')"
      kind="error"
    >
    </NeInlineNotification>
    {{ t('standalone.backup_and_restore.backup.remove_passphrase_description') }}
  </NeModal>
</template>
