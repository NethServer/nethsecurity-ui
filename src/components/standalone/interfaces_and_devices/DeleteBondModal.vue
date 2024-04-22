<script lang="ts" setup>
import { getAxiosErrorMessage, NeInlineNotification } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

const { t } = useI18n()
// using changes store there because all view does so
const changeStore = useUciPendingChangesStore()

const props = defineProps({
  visible: { type: Boolean, default: false },
  bond: { type: String, default: '' }
})

const emit = defineEmits(['close', 'success'])

const loading = ref(false)
const error = ref<Error>()
const computedBond = ref<typeof props.bond>()

watch(
  () => props.bond,
  (value) => {
    if (value) {
      computedBond.value = value
    }
  }
)

function submit() {
  loading.value = true
  error.value = undefined
  ubusCall('ns.devices', 'delete-bond', {
    name: computedBond.value
  })
    .then(() => {
      changeStore.getChanges()
      emit('success')
    })
    .catch((reason: Error) => {
      error.value = reason
    })
    .finally(() => {
      loading.value = false
    })
}

function handleClose() {
  if (!loading.value) {
    error.value = undefined
    emit('close')
  }
}
</script>

<template>
  <NeModal
    :cancel-label="t('common.cancel')"
    :close-aria-label="t('common.close')"
    :primary-button-disabled="loading"
    :primary-button-kind="'danger'"
    :primary-button-loading="loading"
    :primary-label="t('common.delete')"
    :secondary-button-disabled="loading"
    :secondary-button-loading="loading"
    :title="t('standalone.interfaces_and_devices.delete_bond_title', { name: computedBond })"
    :visible="visible"
    kind="warning"
    @close="handleClose"
    @primaryClick="submit"
  >
    <div class="space-y-4">
      <NeInlineNotification
        v-if="error"
        :description="t(getAxiosErrorMessage(error))"
        :title="t('standalone.interfaces_and_devices.cannot_delete_bond')"
        class="mt-4"
        kind="error"
      />
      <p>
        {{ t('standalone.interfaces_and_devices.delete_bond_description', { name: computedBond }) }}
      </p>
    </div>
  </NeModal>
</template>
