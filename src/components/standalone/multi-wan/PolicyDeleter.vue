<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import type { PropType } from 'vue'
import { ref } from 'vue'
import type { Policy } from '@/composables/useMwan'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosError } from 'axios'

const { t } = useI18n()

const props = defineProps({
  policy: {
    type: Object as PropType<Policy>
  }
})

const emit = defineEmits(['close', 'success'])

const loading = ref(false)
const error = ref<Error>()

function deletePolicy() {
  loading.value = true
  ubusCall('ns.mwan', 'delete_policy', {
    name: props.policy?.name
  })
    .then(() => emit('success'))
    .catch((reason: AxiosError) => (error.value = reason))
    .finally(() => (loading.value = false))
}

function handleClose() {
  if (!loading.value) {
    emit('close')
  }
}
</script>

<template>
  <NeModal
    :primary-button-disabled="loading"
    :primary-button-loading="loading"
    :primary-label="t('standalone.multi_wan.delete_policy_modal.button')"
    :secondary-button-disabled="loading"
    :title="
      t('standalone.multi_wan.delete_policy_modal.title', { name: policy?.label ?? policy?.name })
    "
    :visible="policy != undefined"
    kind="warning"
    primary-button-kind="danger"
    :close-aria-label="t('common.close')"
    @close="handleClose()"
    @primary-click="deletePolicy()"
  >
    <NeInlineNotification v-if="error" :title="t(getAxiosErrorMessage(error))" kind="error" />
  </NeModal>
</template>
