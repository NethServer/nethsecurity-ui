<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import type { Rule } from '@/components/standalone/security/ips/IpsDisabledRules.vue'
import { ref, watchEffect } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { getAxiosErrorMessage, NeInlineNotification, NeModal } from '@nethesis/vue-components'

const { t } = useI18n()

const { rule } = defineProps<{
  rule?: Rule
}>()

const _rule = ref<Rule | undefined>()
watchEffect(() => {
  if (rule != undefined) {
    _rule.value = rule
  }
})

const emit = defineEmits<{
  close: []
  enabled: []
}>()

const loading = ref(false)
const error = ref<Error>()

function handleClose() {
  if (!loading.value) {
    emit('close')
  }
}

function enableRule() {
  loading.value = true
  error.value = undefined
  ubusCall('ns.snort', 'enable-rule', {
    gid: _rule.value!.gid,
    sid: _rule.value!.sid
  })
    .then(() => {
      emit('enabled')
    })
    .catch((reason: Error) => {
      error.value = reason
    })
    .finally(() => {
      loading.value = false
    })
}
</script>

<template>
  <NeModal
    :cancel-label="t('common.cancel')"
    :close-aria-label="t('common.close')"
    :primary-button-disabled="loading"
    :primary-button-loading="loading"
    :primary-label="t('common.delete')"
    :title="t('standalone.ips.enable_rule_modal_title')"
    :visible="rule != undefined"
    kind="warning"
    primary-button-kind="danger"
    @close="handleClose()"
    @primary-click="enableRule()"
  >
    <div class="space-y-4">
      <NeInlineNotification
        v-if="error"
        :description="t(getAxiosErrorMessage(error))"
        :title="t('standalone.ips.enable_rule_error')"
        kind="error"
      />
      <p>
        {{
          t('standalone.ips.enable_rule_modal_description', {
            id: `${_rule!.gid}:${_rule!.sid}`,
            description: _rule!.description
          })
        }}
      </p>
    </div>
  </NeModal>
</template>
