//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import axios from 'axios'
import { getStandaloneApiEndpoint } from '../config'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'

// single element of an instant-query result vector
export interface VmInstantResult {
  metric: Record<string, string>
  // [ timestamp, value ]
  value: [number, string]
}

// single element of a range-query result matrix
export interface VmRangeResult {
  metric: Record<string, string>
  // [ [ timestamp, value ], ... ]
  values: [number, string][]
}

// native VictoriaMetrics query response
export interface VmResponse<T> {
  status: string
  data: {
    resultType: string
    result: T[]
  }
}

// instant query against the local VictoriaMetrics through the authenticated
// API server reverse proxy (GET /api/metrics/query)
export async function vmQuery(query: string) {
  const loginStore = useLoginStore()
  const res = await axios.get<VmResponse<VmInstantResult>>(
    `${getStandaloneApiEndpoint()}/metrics/query`,
    {
      params: { query },
      headers: {
        Authorization: `Bearer ${loginStore.token}`
      }
    }
  )
  return res.data
}

// range query against the local VictoriaMetrics through the authenticated API
// server reverse proxy (GET /api/metrics/query_range)
// start/end are unix timestamps (seconds), step is the resolution in seconds
export async function vmQueryRange(query: string, start: number, end: number, step: number) {
  const loginStore = useLoginStore()
  const res = await axios.get<VmResponse<VmRangeResult>>(
    `${getStandaloneApiEndpoint()}/metrics/query_range`,
    {
      params: { query, start, end, step },
      headers: {
        Authorization: `Bearer ${loginStore.token}`
      }
    }
  )
  return res.data
}
