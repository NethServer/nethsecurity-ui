<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { NeModal, NeInlineNotification, getAxiosErrorMessage } from '@nethserver/vue-tailwind-lib'
import { ref, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DnsRecord } from './DnsRecords.vue'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  itemToDelete: DnsRecord | null
}>()

const emit = defineEmits(['close', 'record-deleted'])

const { visible, itemToDelete } = toRefs(props)
const error = ref('')
const isDeleting = ref(false)

async function deleteDnsRecord() {
  if (itemToDelete.value) {
    try {
      error.value = ''
      isDeleting.value = true
      await ubusCall('ns.dns', 'delete-record', {
        record: itemToDelete.value.record
      })
      emit('record-deleted')
      emit('close')
    } catch (err: any) {
      error.value =
        err.response.data.message == 'record_not_found'
          ? t('standalone.dns_dhcp.record_not_found')
          : t(getAxiosErrorMessage(err))
    } finally {
      isDeleting.value = false
    }
  }
}

function close() {
  error.value = ''
  emit('close')
}
</script>

<template>
  <NeModal
    :visible="visible"
    kind="warning"
    :title="t('standalone.dns_dhcp.delete_dns_record')"
    :primaryLabel="t('common.delete')"
    :primaryButtonDisabled="isDeleting"
    :primaryButtonLoading="isDeleting"
    @primaryClick="deleteDnsRecord()"
    @close="close()"
  >
    {{
      t('standalone.dns_dhcp.delete_dns_record_message', {
        name: itemToDelete?.name ?? ''
      })
    }}
    <NeInlineNotification
      v-if="error"
      kind="error"
      :title="t('error.cannot_delete_dns_record')"
      :description="error"
    />
  </NeModal>
</template>
