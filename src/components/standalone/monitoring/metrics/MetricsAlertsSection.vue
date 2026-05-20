<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeBadgeV2,
  type NeBadgeV2Kind,
  NeEmptyState,
  NeInlineNotification,
  NeTable,
  NeTableBody,
  NeTableCell,
  NeTableHead,
  NeTableHeadCell,
  NeTableRow,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { useAlerts, type Alert } from '@/composables/useAlerts'
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons'

const { t, locale } = useI18n()

const { data, error, isError, isPending } = useAlerts()

const errorDescription = computed(() => {
  const currentError = error.value
  const axiosErrorMessage = currentError ? getAxiosErrorMessage(currentError) : undefined

  if (axiosErrorMessage) {
    return t(axiosErrorMessage)
  }

  return t('error.generic_error')
})

function getLocalizedAnnotation(alert: Alert, annotation: 'summary' | 'description') {
  const localeCode = locale.value.split('-')[0]

  return (
    alert.annotations[`${annotation}_${localeCode}`] ??
    alert.annotations[`${annotation}_en`] ??
    alert.annotations[annotation] ??
    ''
  )
}

function getStateBadgeKind(state: string): NeBadgeV2Kind {
  switch (state) {
    case 'firing':
      return 'rose'
    case 'pending':
      return 'blue'
    default:
      return 'gray'
  }
}

function getSeverityBadgeKind(severity: string | undefined): NeBadgeV2Kind {
  switch (severity) {
    case 'critical':
      return 'rose'
    case 'warning':
      return 'amber'
    case 'info':
      return 'blue'
    default:
      return 'gray'
  }
}

function getSeverityLabel(alert: Alert) {
  switch (alert.labels.severity) {
    case 'critical':
      return t('standalone.metrics.critical')
    case 'warning':
      return t('standalone.metrics.warning')
    case 'info':
      return t('standalone.metrics.info')
    default:
      return t('standalone.metrics.unknown')
  }
}

function getStateLabel(alert: Alert) {
  switch (alert.state) {
    case 'firing':
      return t('standalone.metrics.firing')
    case 'pending':
      return t('standalone.metrics.pending')
    default:
      return t('standalone.metrics.unknown')
  }
}

function formatActiveAt(activeAt: string) {
  return Intl.DateTimeFormat(locale.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(activeAt))
}
</script>

<template>
  <div class="space-y-6">
    <NeInlineNotification
      v-if="isError"
      kind="error"
      :title="t('standalone.metrics.cannot_retrieve_alerts')"
      :description="errorDescription"
      :close-aria-label="t('common.close')"
    />

    <NeEmptyState
      v-if="!isError && !isPending && !(data ?? []).length"
      :title="t('standalone.metrics.no_alerts_yet')"
      :description="t('standalone.metrics.no_alerts_description')"
      :icon="faCircleCheck"
    />

    <NeTable
      v-else
      :aria-label="t('standalone.metrics.alerts_table_aria_label')"
      card-breakpoint="xl"
      :loading="isPending"
      :skeleton-columns="5"
      :skeleton-rows="6"
    >
      <NeTableHead>
        <NeTableHeadCell>{{ t('standalone.metrics.severity') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.metrics.alert') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.metrics.status') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.metrics.triggered_by') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.metrics.started_at') }}</NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow v-for="alert in data!" :key="`${alert.name}-${alert.activeAt}`">
          <NeTableCell :data-label="t('standalone.metrics.severity')">
            <NeBadgeV2 :kind="getSeverityBadgeKind(alert.labels.severity)" size="xs">
              {{ getSeverityLabel(alert) }}
            </NeBadgeV2>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.metrics.alert')">
            <div class="space-y-1 whitespace-normal">
              <p>
                {{ getLocalizedAnnotation(alert, 'summary') || alert.name }}
              </p>
              <p
                v-if="getLocalizedAnnotation(alert, 'description')"
                class="text-xs text-tertiary-neutral"
              >
                {{ getLocalizedAnnotation(alert, 'description') }}
              </p>
            </div>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.metrics.status')">
            <NeBadgeV2 :kind="getStateBadgeKind(alert.state)" size="xs">
              {{ getStateLabel(alert) }}
            </NeBadgeV2>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.metrics.triggered_by')">
            <div class="space-y-1">
              <p>
                {{ alert.name }}
              </p>
              <p class="text-xs text-tertiary-neutral">
                {{ t('standalone.metrics.service') }}: {{ alert.labels.service ?? '-' }}
                <span class="mx-1">-</span>
                {{ t('standalone.metrics.group') }}: {{ alert.labels.alertgroup ?? '-' }}
              </p>
            </div>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.metrics.started_at')">
            {{ formatActiveAt(alert.activeAt) }}
          </NeTableCell>
        </NeTableRow>
      </NeTableBody>
    </NeTable>
  </div>
</template>
