<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeProgressBar } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { watch } from 'vue'
import { useTimer } from '@/composables/useTimer'

const REBOOT_WAIT_TIME = 60000

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
}>()

const { startTimer, currentProgress } = useTimer({
  duration: REBOOT_WAIT_TIME,
  progressStep: 0.5,
  onTimerFinish: () => {
    location.reload()
  }
})

watch(
  () => props.visible,
  () => {
    if (props.visible) {
      startTimer()
    }
  }
)
</script>

<template>
  <NeModal
    :visible="visible"
    :title="t('standalone.update.system_update')"
    :primary-button-disabled="true"
    :primary-button-loading="true"
    :primary-label="t('standalone.update.update')"
    kind="info"
    :cancel-label="''"
    :close-aria-label="t('common.close')"
  >
    <p>
      {{ t('standalone.update.system_update_in_progress_message') }}
    </p>
    <NeProgressBar class="mt-4" :progress="currentProgress" />
  </NeModal>
</template>
