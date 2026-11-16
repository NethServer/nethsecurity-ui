//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'

export type DpiRuleAction = 'block' | 'allow'

export type DpiRuleAppGroup = {
  id: string
  name: string
}

// an object referenced by a rule source; type and subtype are null when the object no longer exists
export type DpiRuleSourceObject = {
  id: string
  name: string
  type: string | null
  subtype: string | null
}

// an object a rule source can reference, as returned by list-source-objects
export type DpiSourceObject = {
  id: string
  name: string
  type: string
  subtype: string
}

export type DpiRule = {
  id: string
  name: string
  enabled: boolean
  action: DpiRuleAction
  source: string[]
  source_objects?: DpiRuleSourceObject[]
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
  source_objects: string[]
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

export const DPI_SOURCE_OBJECTS_KEY = ['dpi', 'source-objects']

type ListSourceObjectsResponse = { data: { values: DpiSourceObject[] } }

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

export function useDpiSourceObjects(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: DPI_SOURCE_OBJECTS_KEY,
    queryFn: ({ signal }) =>
      ubusCall<ListSourceObjectsResponse>('ns.dpi', 'list-source-objects', {}, { signal }),
    select: (res) => res.data.values,
    enabled
  })
}

/**
 * Labels of a rule source, objects first: object names followed by the addresses.
 */
export function ruleSourceLabels(rule: DpiRule): string[] {
  return [...(rule.source_objects ?? []).map((sourceObject) => sourceObject.name), ...rule.source]
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
