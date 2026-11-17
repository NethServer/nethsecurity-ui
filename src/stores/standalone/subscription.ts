import { defineStore } from 'pinia'
import { computed, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import { DPI_APPGROUP_CATALOG_KEY } from '@/composables/useDpiCatalog.ts'

type SubscriptionInfoResponse = { data: SubscriptionDataType }

export const SUBSCRIPTION_KEY = ['subscription']

export type SubscriptionDataType = {
  server_id?: number | string
  systemd_id: string
  plan?: string
  expiration?: number
  active?: boolean
  // enterprise units (migrated to the new my): type='enterprise' and the
  // organization name; community units keep the legacy plan name and no org.
  type?: string
  organization?: string
  // enterprise: the system name given on my at creation time
  system_name?: string
  // link to the system page on the my portal
  system_url?: string
  migrated?: boolean
  // timestamp of the last answer from my, 0 if there's none
  checked_at?: number
  // true when the last check couldn't reach my and the cached status is returned
  stale?: boolean
}

/** True for a registered unit whose status hasn't been confirmed by my yet */
export function isSubscriptionUnknown(data?: SubscriptionDataType | null) {
  return !!data?.systemd_id && !data.active && data.checked_at === 0
}

export const useSubscriptionStore = defineStore('subscription', () => {
  const queryClient = useQueryClient()

  const { data, isPending, error } = useQuery({
    queryKey: [...SUBSCRIPTION_KEY, 'info'],
    queryFn: () => ubusCall<SubscriptionInfoResponse>('ns.subscription', 'info'),
    select: (res) => res.data,
    refetchInterval: (query) => (isSubscriptionUnknown(query.state.data?.data) ? 30000 : false)
  })

  const isActive = computed(() => data.value?.active ?? false)
  const isEnterprise = computed(() => data.value?.type === 'enterprise')

  watch(data, () => queryClient.invalidateQueries({ queryKey: DPI_APPGROUP_CATALOG_KEY }))

  return {
    data,
    loading: isPending,
    isActive,
    isEnterprise,
    error: computed(() => error.value ?? undefined)
  }
})
