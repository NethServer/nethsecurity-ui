<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { NeButton, NeTooltip } from '@nethesis/vue-components'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { isStandaloneMode } from '@/lib/config'

const { t } = useI18n()

function goToReport() {
  window.open('http://' + window.location.hostname + ':19999')
}
</script>

<template>
  <div>
    <FormLayout
      :description="t('standalone.report.real_time_report.description')"
      class="max-w-12xl"
    >
      <div class="mr-auto self-start">
        <NeButton v-if="isStandaloneMode()" kind="secondary" size="lg" @click="goToReport()">
          <template #prefix>
            <FontAwesomeIcon :icon="['fa', 'arrow-up-right-from-square']" />
          </template>
          {{ t('standalone.report.real_time_report.open_report') }}
        </NeButton>
        <!-- cannot open report from a controlled unit -->
        <NeTooltip v-else triggerEvent="mouseenter focus">
          <template #trigger>
            <NeButton kind="secondary" size="lg" disabled>
              <template #prefix>
                <FontAwesomeIcon :icon="['fa', 'arrow-up-right-from-square']" />
              </template>
              {{ t('standalone.report.real_time_report.open_report') }}
            </NeButton>
          </template>
          <template #content>
            {{ t('standalone.report.real_time_report.cannot_open_report_from_controller') }}
          </template>
        </NeTooltip>
      </div>
    </FormLayout>
  </div>
</template>
