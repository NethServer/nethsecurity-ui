<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeInlineNotification } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'

const props = defineProps<{
  visible: boolean
  platformInfo: Record<string, any> | null
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
    :visible="props.visible"
    kind="info"
    :title="t('common.shell.platform_info')"
    :primary-label="t('common.close')"
    :primary-action="close"
    :close-aria-label="t('common.close')"
    @primary-click="close()"
    @close="close()"
  >
    <div class="d-flex flex-column align-items-center my-3">
      <NeInlineNotification
        v-if="props.error"
        kind="error"
        :title="t('error.generic_error')"
        :description="props.error"
        class="my-2"
      />
      <div v-if="props.platformInfo && !props.error" class="w-100">
        <table class="table-sm table">
          <tbody>
            <tr v-for="(value, key) in props.platformInfo" :key="key">
              <th class="pe-3">{{ t(`common.platform.${key}`, key) }}</th>
              <td>{{ value }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </NeModal>
</template>
