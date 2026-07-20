import { ubusCall } from '@/lib/standalone/ubus'
import { useQuery } from '@tanstack/vue-query'
import type { NeNotificationV2 } from '@nethesis/vue-components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSystemActionStore } from '@/stores/standalone/systemAction'

export type Alert = {
  id?: string
  activeAt: string
  annotations: Record<string, string>
  labels: Record<string, string>
  name: string
  source?: string
  state: string
}

type ListAlertsResponse = {
  data: {
    alerts: Alert[]
  }
}

function getSeverityBadgeKind(severity: string | undefined): NeNotificationV2['kind'] {
  switch (severity) {
    case 'critical':
      return 'error'
    case 'warning':
      return 'warning'
    default:
      return 'info'
  }
}

export function useAlerts() {
  const { locale, t } = useI18n()
  const systemActionStore = useSystemActionStore()

  const { data, error, status, isPending, isError, dataUpdatedAt } = useQuery({
    queryKey: ['metrics', 'alerts'],
    queryFn: ({ signal }) =>
      ubusCall<ListAlertsResponse>('ns.telegraf', 'list-alerts', {}, { signal }),
    select: (response) => response.data.alerts,
    refetchInterval: 15000,
    // Pause polling while a disruptive system action (reboot, update, image
    // flash) is in progress: the device is temporarily unreachable and the UI
    // reloads once the action completes, re-enabling the query.
    enabled: computed(() => !systemActionStore.isSystemActionInProgress)
  })

  const notifications = computed<NeNotificationV2[]>(() => {
    if (!data.value) {
      return []
    }

    return data.value.map((alert) => {
      const summary =
        alert.annotations[`summary_${locale.value}`] ||
        alert.annotations['summary_en'] ||
        alert.name
      const description =
        alert.annotations[`description_${locale.value}`] ||
        alert.annotations['description_en'] ||
        ''

      return {
        id: alert.id ?? `${alert.name}-${alert.activeAt}`,
        kind: getSeverityBadgeKind(alert.labels.severity),
        title: summary,
        description: description,
        timestamp: new Date(alert.activeAt),
        firstButtonLabel: t('standalone.metrics.go_to_alerts'),
        firstButtonAction: 'goto_alerts',
        isShown: true
      }
    })
  })

  return {
    data,
    notifications,
    error,
    status,
    isPending,
    isError,
    dataUpdatedAt
  }
}
