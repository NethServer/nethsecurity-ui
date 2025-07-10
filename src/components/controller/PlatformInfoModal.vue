<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeInlineNotification, NeModal } from '@nethesis/vue-components'

defineProps<{
  visible: boolean
  platformInfo: Record<string, string | number>
  error?: string | null
}>()

const emit = defineEmits(['close'])

const { t } = useI18n()

function close() {
  emit('close')
}
</script>

<template>
  <NeModal
    :visible="visible"
    kind="info"
    :title="t('common.shell.platform_info')"
    :primary-label="t('common.close')"
    :primary-action="close"
    :close-aria-label="t('common.close')"
    @close="close"
    @primary-click="close"
  >
    <div class="d-flex flex-column align-items-center my-3">
      <NeInlineNotification
        v-if="error"
        kind="error"
        :title="t('error.generic_error')"
        :description="error"
        class="my-2"
      />
      <div v-else class="w-100">
        <table class="table-sm table">
          <tbody>
            <tr v-for="(value, key) in platformInfo" :key="key">
              <th class="pe-3">{{ t(`common.platform.${key}`, key) }}</th>
              <td>{{ value }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </NeModal>
</template>
