import { ubusCall } from './ubus'

type DashboardStatus = string

export interface TunnelSummary {
  enabled: number
  connected: number
}

export interface DashboardSummary {
  systemInfo: Record<string, unknown>
  serviceStatus: Record<string, DashboardStatus>
  counters: Record<string, number>
  tunnels: {
    ipsec: TunnelSummary
    ovpn: TunnelSummary
  }
  threatShield: {
    monitoringEnabled: boolean
  }
}

type UbusCaller = typeof ubusCall

export async function fetchDashboardSummary(callUbus: UbusCaller = ubusCall) {
  const response = await callUbus<{ data: { result: DashboardSummary } }>('ns.dashboard', 'summary')
  return response.data.result
}

export function getServiceCardInitialData(summary: DashboardSummary, serviceName: string) {
  const status = summary.serviceStatus[serviceName]
  const count = summary.counters[serviceName]

  return {
    ...(status !== undefined ? { status } : {}),
    ...(count !== undefined ? { count } : {})
  }
}

export function isThreatShieldMonitoringDisabled(summary: DashboardSummary) {
  return !summary.threatShield.monitoringEnabled
}
