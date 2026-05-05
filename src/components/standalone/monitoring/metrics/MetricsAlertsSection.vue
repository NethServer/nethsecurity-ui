<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import {
  NeBadgeV2,
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
import { ubusCall } from '@/lib/standalone/ubus'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'

type BadgeKind = InstanceType<typeof NeBadgeV2>['$props']['kind']

interface MetricsAlert {
  activeAt: string
  annotations: Record<string, string>
  labels: Record<string, string>
  name: string
  source?: string
  state: string
}

interface ListAlertsResponse {
  alerts?: MetricsAlert[]
  error?: string
}

const props = defineProps<{
  refreshInterval: number | false
}>()

const emit = defineEmits<{
  'updated-at': [value: number]
}>()

const { t, locale } = useI18n()
const loginStore = useLoginStore()

const { data, error, isError, isPending, dataUpdatedAt } = useQuery({
  queryKey: ['metrics-alerts'],
  queryFn: async () => {
    const res = await ubusCall('ns.telegraf', 'list-alerts')
    const response = res.data as ListAlertsResponse

    if (response.error) {
      throw new Error(response.error)
    }

    return response.alerts ?? []
  },
  refetchInterval: computed(() => props.refreshInterval),
  refetchOnWindowFocus: false,
  enabled: computed(() => Boolean(loginStore.username))
})

watch(
  dataUpdatedAt,
  (value) => {
    emit('updated-at', value)
  },
  { immediate: true }
)

const alerts = computed(() => data.value ?? [])

const errorDescription = computed(() => {
  const currentError = error.value
  const axiosErrorMessage = currentError ? getAxiosErrorMessage(currentError) : undefined

  if (axiosErrorMessage) {
    return t(axiosErrorMessage)
  }

  return t('error.generic_error')
})

function getLocalizedAnnotation(alert: MetricsAlert, annotation: 'summary' | 'description') {
  const localeCode = locale.value.split('-')[0]

  return (
    alert.annotations[`${annotation}_${localeCode}`] ??
    alert.annotations[`${annotation}_en`] ??
    alert.annotations[annotation] ??
    ''
  )
}

function getStateBadgeKind(state: string): BadgeKind {
  switch (state) {
    case 'firing':
      return 'rose'
    case 'pending':
      return 'blue'
    default:
      return 'gray'
  }
}

function getSeverityBadgeKind(severity: string | undefined): BadgeKind {
  switch (severity) {
    case 'critical':
      return 'rose'
    case 'warning':
      return 'blue'
    case 'info':
      return 'green'
    default:
      return 'gray'
  }
}

function getSeverityLabel(alert: MetricsAlert) {
  const severity = alert.labels.severity ?? 'unknown'
  return t(`standalone.metrics.${severity}`)
}

function getStateLabel(alert: MetricsAlert) {
  const state = ['firing', 'pending'].includes(alert.state) ? alert.state : 'unknown'
  return t(`standalone.metrics.${state}`)
}

function formatActiveAt(activeAt: string) {
  const parsedDate = new Date(activeAt)

  if (Number.isNaN(parsedDate.getTime())) {
    return '-'
  }

  return parsedDate.toLocaleString(locale.value)
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
      v-if="!isPending && !isError && !alerts.length"
      :title="t('standalone.metrics.no_alerts')"
      :description="t('standalone.metrics.no_alerts_description')"
      :icon="['fas', 'bell']"
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
        <NeTableHeadCell>{{ t('standalone.metrics.alert') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.metrics.state') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.metrics.severity') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.metrics.summary') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.metrics.active_since') }}</NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow v-for="alert in alerts" :key="`${alert.name}-${alert.activeAt}`">
          <NeTableCell :data-label="t('standalone.metrics.alert')">
            <div class="space-y-1">
              <p class="font-medium text-gray-900 dark:text-gray-50">
                {{ alert.name }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ t('standalone.metrics.service') }}: {{ alert.labels.service ?? '-' }}
                <span class="mx-1">-</span>
                {{ t('standalone.metrics.group') }}: {{ alert.labels.alertgroup ?? '-' }}
              </p>
            </div>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.metrics.state')">
            <NeBadgeV2 :kind="getStateBadgeKind(alert.state)" size="xs">
              {{ getStateLabel(alert) }}
            </NeBadgeV2>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.metrics.severity')">
            <NeBadgeV2 :kind="getSeverityBadgeKind(alert.labels.severity)" size="xs">
              {{ getSeverityLabel(alert) }}
            </NeBadgeV2>
          </NeTableCell>
          <NeTableCell
            :data-label="t('standalone.metrics.summary')"
            class="max-w-2xl whitespace-normal"
          >
            <div class="space-y-1 whitespace-normal">
              <p class="text-sm text-gray-900 dark:text-gray-50">
                {{ getLocalizedAnnotation(alert, 'summary') || alert.name }}
              </p>
              <p
                v-if="getLocalizedAnnotation(alert, 'description')"
                class="text-xs text-gray-500 dark:text-gray-400"
              >
                {{ getLocalizedAnnotation(alert, 'description') }}
              </p>
            </div>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.metrics.active_since')">
            {{ formatActiveAt(alert.activeAt) }}
          </NeTableCell>
        </NeTableRow>
      </NeTableBody>
    </NeTable>
  </div>
</template>
