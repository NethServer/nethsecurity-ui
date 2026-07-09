//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { ubusCall } from '@/lib/standalone/ubus'
import { useQuery } from '@tanstack/vue-query'

export type ServiceStatus = 'ok' | 'warning' | 'error' | 'disabled' | null

export type StorageEntry = {
  used_bytes: number
  available_bytes: number
}

export type SystemInfo = {
  uptime: number
  load: [number, number, number]
  version: {
    arch: string
    release: string
  }
  hostname: string
  hardware: string
  memory: {
    mem_total: number
    mem_available: number
  }
  storage: {
    '/': StorageEntry
    '/mnt/data': StorageEntry
    tmpfs: StorageEntry
  }
}

export type TunnelCounters = {
  enabled: number
  connected: number
}

export type WireguardSummary = {
  enabled_servers: number
  active_peers: number
}

export type HaSummary = {
  status: 'enabled' | 'disabled' | 'unknown'
  role: 'primary' | 'backup' | 'unknown'
  state: string
  last_sync_status: string
  last_sync_time: number | string
}

// Every section can degrade to null if the corresponding subsystem fails on
// the firewall; the section name is then listed in `errors`.
export type DashboardOverview = {
  system: SystemInfo | null
  services: {
    dns_configured: ServiceStatus
    mwan: ServiceStatus
    openvpn_rw: ServiceStatus
    threat_shield_dns: ServiceStatus
    dedalo: ServiceStatus
    banip: ServiceStatus
  }
  counters: {
    hosts: number | null
    openvpn_rw: number | null
    threat_shield_ip: number | null
  }
  vpn: {
    ipsec: TunnelCounters | null
    ovpn: TunnelCounters | null
    wireguard: WireguardSummary | null
  }
  threat_shield: {
    logging_enabled: boolean
  } | null
  mac_binding: {
    enabled: boolean
  } | null
  ips: {
    enabled: boolean
    events: number
  } | null
  ha: HaSummary | null
  errors: string[]
}

export type DashboardServiceName = keyof DashboardOverview['services']
export type DashboardCounterName = keyof DashboardOverview['counters']

// ubusCall returns the HTTP body (it already unwraps the AxiosResponse). The
// api-server wraps every ubus result under `data`, and the ns.dashboard script
// wraps its output under `result`.
type DashboardOverviewResponse = {
  data: {
    result: DashboardOverview
  }
}

export const DASHBOARD_REFRESH_INTERVAL = 20_000

export function useDashboardOverview() {
  // The same query key is shared by all dashboard cards: TanStack Query
  // deduplicates them into a single HTTP request per refresh interval
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => ubusCall<DashboardOverviewResponse>('ns.dashboard', 'dashboard-v2'),
    select: (res) => res.data.result,
    refetchInterval: DASHBOARD_REFRESH_INTERVAL
  })
}
