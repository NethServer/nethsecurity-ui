<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { getAxiosErrorMessage, NeInlineNotification, NeModal } from '@nethesis/vue-components'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import type { Bypass } from '@/components/standalone/security/ips/IpsFilterBypass.vue'

const { t } = useI18n()

const { bypass } = defineProps<{
  bypass?: Bypass
}>()

/*
 * Shallow variable
 */
const _byPass = ref<Bypass | undefined>()
watch(
  () => bypass,
  (value) => {
    if (value != undefined) {
      _byPass.value = value
    }
  }
)

const emit = defineEmits<{
  close: []
  deleted: []
}>()

const loading = ref(false)
const error = ref<Error>()

function handleClose() {
  if (!loading.value) {
    emit('close')
  }
}

function deleteBypass() {
  loading.value = true
  ubusCall('ns.snort', 'delete-bypass', {
    protocol: _byPass.value?.protocol,
    ip: _byPass.value?.ip,
    direction: _byPass.value?.direction
  })
    .then(() => {
      emit('deleted')
    })
    .catch((reason) => {
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
    :title="t('standalone.ips.delete_bypass_modal_title')"
    :visible="bypass != undefined"
    kind="warning"
    primary-button-kind="danger"
    @close="handleClose()"
    @primary-click="deleteBypass()"
  >
    <div class="space-y-4">
      <NeInlineNotification
        v-if="error"
        kind="error"
        :title="t('standalone.ips.delete_bypass_error')"
        :description="t(getAxiosErrorMessage(error))"
      />
      <p>
        <template v-if="_byPass?.description == undefined">
          {{
            t('standalone.ips.delete_bypass_modal_w_description', {
              description: _byPass?.description
            })
          }}
        </template>
        <template v-else>
          {{
            t('standalone.ips.delete_bypass_modal_wo_description', {
              ip: _byPass?.ip,
              direction:
                _byPass.direction == 'src'
                  ? t('standalone.ips.source')
                  : t('standalone.ips.destination')
            })
          }}
        </template>
      </p>
    </div>
  </NeModal>
</template>
