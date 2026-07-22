//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { ubusCall } from '@/lib/standalone/ubus'
import { useQuery } from '@tanstack/vue-query'

// Different consumers read different fields of the ThreatShield IP
// list-settings payload, so all are optional here.
export type ThreatShieldSettings = {
  enabled?: boolean
  ban_logforwardlan?: boolean
  ban_logforwardwan?: boolean
  ban_loginput?: boolean
  ban_logprerouting?: boolean
}

// api-server wraps the ubus result under `data`, and ns.threatshield wraps its
// own output under a second `data`.
type ThreatShieldSettingsResponse = {
  data: {
    data: ThreatShieldSettings
  }
}

// Shared query for ThreatShield IP settings (ns.threatshield list-settings).
// The `signal` from the queryFn context is threaded into ubusCall so the
// request is aborted when the last consuming component unmounts.
export function useThreatShieldSettings(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['threatshield', 'settings'],
    queryFn: ({ signal }) =>
      ubusCall<ThreatShieldSettingsResponse>('ns.threatshield', 'list-settings', {}, { signal }),
    select: (res) => res.data.data,
    refetchInterval: options?.refetchInterval
  })
}
