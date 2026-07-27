//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { ubusCall } from '@/lib/standalone/ubus'
import { useQuery } from '@tanstack/vue-query'

export type IpsStatus = {
  enabled: boolean
  events: number
}

// ubusCall unwraps the AxiosResponse; the api-server wraps the ubus result
// under `data`.
type IpsStatusResponse = {
  data: {
    status: IpsStatus
  }
}

// Shared query for the IPS (snort) status. The `signal` from the queryFn
// context is threaded into ubusCall so the request is aborted when the last
// consuming component unmounts.
export function useIpsStatus(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['ips', 'status'],
    queryFn: ({ signal }) => ubusCall<IpsStatusResponse>('ns.snort', 'status', {}, { signal }),
    select: (res) => res.data.status,
    refetchInterval: options?.refetchInterval
  })
}
