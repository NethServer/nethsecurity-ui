<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import type { Rule } from '@/composables/useMwan'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosError } from 'axios'

const { t } = useI18n()

const props = defineProps<{
  rule: Rule | undefined
}>()

const emit = defineEmits<{
  success: []
  cancel: []
}>()

const loading = ref(false)
const error = ref<Error>()

const ruleName = ref('')
const ruleLabel = ref('')

watch(
  () => props.rule,
  () => {
    if (props.rule != undefined) {
      ruleName.value = props.rule.name
      ruleLabel.value = props.rule.label ?? props.rule.name
      loading.value = false
    }
  }
)

function closeHandler() {
  if (!loading.value) {
    emit('cancel')
  }
}

function submit() {
  loading.value = true
  ubusCall('ns.mwan', 'delete_rule', { name: ruleName.value })
    .then(() => emit('success'))
    .catch((reason: AxiosError) => {
      error.value = reason
      loading.value = false
    })
}
</script>

<template>
  <NeModal
    :visible="props.rule != undefined"
    kind="warning"
    @close="closeHandler()"
    primary-button-kind="danger"
    :title="t('standalone.multi_wan.delete_rule_modal.title', { name: ruleLabel })"
    :primary-label="t('standalone.multi_wan.delete_rule_modal.button')"
    :primary-button-disabled="loading"
    :primary-button-loading="loading"
    :secondary-button-disabled="loading"
    :close-aria-label="t('common.close')"
    @primary-click="submit()"
  >
    <NeInlineNotification kind="error" v-if="error" :title="t(getAxiosErrorMessage(error))" />
  </NeModal>
</template>
