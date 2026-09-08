//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { ubusCall } from '@/lib/standalone/ubus'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

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
}

export type DpiRulePosition = 'top' | 'bottom'

export type DpiRulesPage = {
  data: DpiRule[]
  meta: { last_page: number; total: number }
}

type ListRulesResponse = { data: { values: DpiRulesPage | DpiRule[] } }
type RuleIdResponse = { data: { id: string } }
type MessageResponse = { data: { message: string } }

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

function useDpiRulesInvalidation() {
  const queryClient = useQueryClient()
  const uci = useUciPendingChangesStore()

  return () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: DPI_RULES_KEY }), uci.getChanges()])
}

export function useCreateDpiRule() {
  const invalidate = useDpiRulesInvalidation()

  return useMutation({
    mutationFn: (payload: DpiRulePayload & { position: DpiRulePosition }) =>
      ubusCall<RuleIdResponse>('ns.dpi', 'add-rule', payload),
    onSuccess: invalidate
  })
}

export function useEditDpiRule() {
  const invalidate = useDpiRulesInvalidation()

  return useMutation({
    mutationFn: (payload: DpiRulePayload & { id: string }) =>
      ubusCall<RuleIdResponse>('ns.dpi', 'edit-rule', payload),
    onSuccess: invalidate
  })
}

export function useDeleteDpiRule() {
  const invalidate = useDpiRulesInvalidation()

  return useMutation({
    mutationFn: (id: string) => ubusCall<MessageResponse>('ns.dpi', 'delete-rule', { id }),
    onSuccess: invalidate
  })
}

export function useRenameDpiRule() {
  const invalidate = useDpiRulesInvalidation()

  return useMutation({
    mutationFn: (payload: { id: string; name: string }) =>
      ubusCall<MessageResponse>('ns.dpi', 'rename-rule', payload),
    onSuccess: invalidate
  })
}

export function useToggleDpiRule() {
  const invalidate = useDpiRulesInvalidation()

  return useMutation({
    mutationFn: (payload: { id: string; enabled: boolean }) =>
      ubusCall<MessageResponse>('ns.dpi', payload.enabled ? 'enable-rule' : 'disable-rule', {
        id: payload.id
      }),
    onSuccess: invalidate
  })
}

export function useOrderDpiRules() {
  const invalidate = useDpiRulesInvalidation()

  return useMutation({
    mutationFn: (order: string[]) =>
      ubusCall<ListRulesResponse>('ns.dpi', 'order-rules', { order }),
    onSuccess: invalidate
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
