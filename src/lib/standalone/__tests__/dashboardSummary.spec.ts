import { describe, expect, it, vi } from 'vitest'
import {
  fetchDashboardSummary,
  getServiceCardInitialData,
  isThreatShieldMonitoringDisabled,
  type DashboardSummary
} from '@/lib/standalone/dashboardSummary'

describe('dashboardSummary', () => {
  it('fetches the aggregated dashboard summary with one ubus call', async () => {
    const ubusCall = vi.fn().mockResolvedValue({
      data: {
        result: {
          systemInfo: { hostname: 'fw' },
          serviceStatus: {},
          counters: {},
          tunnels: {
            ipsec: { enabled: 0, connected: 0 },
            ovpn: { enabled: 0, connected: 0 }
          },
          threatShield: { monitoringEnabled: false }
        }
      }
    })

    const summary = await fetchDashboardSummary(ubusCall)

    expect(ubusCall).toHaveBeenCalledWith('ns.dashboard', 'summary')
    expect(summary.systemInfo.hostname).toBe('fw')
  })

  it('extracts service-card initial data from the summary', () => {
    const summary: DashboardSummary = {
      systemInfo: { hostname: 'fw' },
      serviceStatus: { mwan: 'ok' },
      counters: { hosts: 23 },
      tunnels: {
        ipsec: { enabled: 1, connected: 0 },
        ovpn: { enabled: 2, connected: 1 }
      },
      threatShield: { monitoringEnabled: false }
    }

    expect(getServiceCardInitialData(summary, 'mwan')).toEqual({ status: 'ok' })
    expect(getServiceCardInitialData(summary, 'hosts')).toEqual({ count: 23 })
    expect(getServiceCardInitialData(summary, 'openvpn_rw')).toEqual({})
    expect(isThreatShieldMonitoringDisabled(summary)).toBe(true)
  })
})
