//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { useQuery } from '@tanstack/vue-query'
import { ubusCall } from '@/lib/standalone/ubus'

export type DpiRuleAction = 'block' | 'allow'

export type DpiRuleAppGroup = {
  id: string
  name: string
}

export type DpiRule = {
  id: string
  name: string
  enabled: boolean
  action: DpiRuleAction
  source: string[]
  appgroups: DpiRuleAppGroup[]
  match_all: boolean
  managed: boolean
  index: number
  criteria?: string
}

export type DpiRulePayload = {
  name: string
  enabled: boolean
  action: DpiRuleAction
  source: string[]
  appgroups: string[]
  match_all: boolean
}

export type DpiRulePosition = 'top' | 'bottom'

export type DpiRulesPage = {
  data: DpiRule[]
  meta: { last_page: number; total: number }
}

export type ListRulesResponse = { data: { values: DpiRulesPage | DpiRule[] } }

export const DPI_RULES_KEY = ['dpi', 'rules']

export function useDpiRules() {
  return useQuery({
    queryKey: [...DPI_RULES_KEY, 'all'],
    queryFn: ({ signal }) => ubusCall<ListRulesResponse>('ns.dpi', 'list-rules', {}, { signal }),
    select: (res) => {
      const values = res.data.values
      return Array.isArray(values) ? values : values.data
    }
  })
}

export function reorderRuleIds(rules: DpiRule[], movedId: string, targetIndex: number): string[] {
  const ids = rules.map((rule) => rule.id)
  const from = ids.indexOf(movedId)
  if (from === -1) {
    return ids
  }

  ids.splice(from, 1)
  // the target index refers to the list before the move
  const to = Math.max(0, Math.min(ids.length, from < targetIndex ? targetIndex - 1 : targetIndex))
  ids.splice(to, 0, movedId)
  return ids
}

export function moveRuleIdToEdge(
  rules: DpiRule[],
  movedId: string,
  edge: DpiRulePosition
): string[] {
  const ids = rules.map((rule) => rule.id).filter((id) => id !== movedId)
  return edge === 'top' ? [movedId, ...ids] : [...ids, movedId]
}
