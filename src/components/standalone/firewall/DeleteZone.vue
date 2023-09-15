<script lang="ts" setup>
import { getAxiosErrorMessage, NeInlineNotification, NeModal } from '@nethserver/vue-tailwind-lib'
import type { PropType } from 'vue'
import { ref } from 'vue'
import type { Zone } from '@/stores/standalone/useFirewallStore'
import { useFirewallStore } from '@/stores/standalone/useFirewallStore'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import type { AxiosError } from 'axios'

const { t } = useI18n()

const firewallConfig = useFirewallStore()
const uciChanges = useUciPendingChangesStore()

const props = defineProps({
  zone: {
    type: Object as PropType<Zone>,
    default: undefined
  }
})

const emit = defineEmits(['success', 'cancel'])

const deleting = ref(false)
const deleteError = ref<Error>()

function deleteZone() {
  deleting.value = true
  ubusCall('ns.firewall', 'delete_zone', {
    config_name: props.zone?.configName
  })
    .then(() => {
      firewallConfig.fetch()
      uciChanges.getChanges()
      emit('success')
    })
    .catch((error: AxiosError) => (deleteError.value = error))
    .finally(() => (deleting.value = false))
}

function cancelHandler() {
  if (!deleting.value) {
    emit('cancel')
  }
}
</script>
<template>
  <NeModal
    :primary-button-disabled="deleting"
    :primary-button-loading="deleting"
    :primary-label="t('common.delete')"
    :secondary-button-disabled="deleting"
    :title="t('standalone.zones_and_policies.delete_zone', [zone?.name])"
    :visible="zone != undefined"
    kind="warning"
    primary-button-kind="danger"
    @close="cancelHandler()"
    @primary-click="deleteZone()"
  >
    <NeInlineNotification
      v-if="deleteError"
      :title="t(getAxiosErrorMessage(deleteError.message))"
      kind="error"
    />
  </NeModal>
</template>
