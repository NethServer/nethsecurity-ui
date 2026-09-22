//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import type { Ref } from 'vue'
import { keepPreviousData, useQuery, type UseQueryReturnType } from '@tanstack/vue-query'
import { ubusCall } from '@/lib/standalone/ubus'
import type { DpiCatalogKind } from '@/composables/useDpiCatalog'

/** A DPI application group, as `list-appgroups` returns it. */
export type DpiApplicationGroup = {
  id: string
  name: string
  applications: string[]
  application_categories: string[]
  protocols: string[]
  protocol_categories: string[]
  used: boolean
  matches: string[]
}

export type DpiApplicationGroupPayload = {
  name: string
  applications: string[]
  application_categories: string[]
  protocols: string[]
  protocol_categories: string[]
}

export type DpiApplicationGroupsPage = {
  data: DpiApplicationGroup[]
  meta: { last_page: number; total: number }
}

type ListAppGroupsResponse = { data: { values: DpiApplicationGroupsPage } }

export const APPLICATION_GROUPS_KEY = ['dpi', 'application-groups']

export type DpiApplicationGroupsPageParams = {
  search: Ref<string>
  page: Ref<number>
  pageSize: Ref<number>
}

export function useApplicationGroups(): UseQueryReturnType<DpiApplicationGroup[], Error>
export function useApplicationGroups(
  params: DpiApplicationGroupsPageParams
): UseQueryReturnType<DpiApplicationGroupsPage, Error>
export function useApplicationGroups(params?: DpiApplicationGroupsPageParams) {
  return useQuery({
    queryKey: params
      ? [...APPLICATION_GROUPS_KEY, 'page', params.search, params.page, params.pageSize]
      : [...APPLICATION_GROUPS_KEY, 'all'],
    queryFn: ({ signal }) =>
      ubusCall<ListAppGroupsResponse>(
        'ns.dpi',
        'list-appgroups',
        params
          ? {
              search: params.search.value || undefined,
              limit: params.pageSize.value,
              page: params.page.value
            }
          : {},
        { signal }
      ),
    select: (res) => (params ? res.data.values : res.data.values.data),
    placeholderData: params ? keepPreviousData : undefined
  })
}

export type DpiGroupMemberType = 'item' | 'category'

export type DpiGroupSelection = {
  type: DpiGroupMemberType
  kind: DpiCatalogKind
  id: string
  name: string
  categoryId: string
}

export type DpiMemberResolver = {
  labelOf: (kind: DpiCatalogKind, type: DpiGroupMemberType, id: string) => string
  categoryOf: (kind: DpiCatalogKind, id: string) => string
}

export function selectionsToPayload(
  name: string,
  selections: DpiGroupSelection[]
): DpiApplicationGroupPayload {
  const payload: DpiApplicationGroupPayload = {
    name,
    applications: [],
    application_categories: [],
    protocols: [],
    protocol_categories: []
  }

  for (const selection of selections) {
    if (selection.kind === 'applications') {
      if (selection.type === 'item') {
        payload.applications.push(selection.id)
      } else {
        payload.application_categories.push(selection.id)
      }
    } else if (selection.type === 'item') {
      payload.protocols.push(selection.id)
    } else {
      payload.protocol_categories.push(selection.id)
    }
  }

  return payload
}

export function selectionsFromGroup(
  group: DpiApplicationGroup,
  resolver: DpiMemberResolver
): DpiGroupSelection[] {
  const build = (
    ids: string[],
    kind: DpiCatalogKind,
    type: DpiGroupMemberType
  ): DpiGroupSelection[] =>
    ids.map((id) => ({
      type,
      kind,
      id,
      name: resolver.labelOf(kind, type, id),
      categoryId: type === 'category' ? id : resolver.categoryOf(kind, id)
    }))

  return [
    ...build(group.applications, 'applications', 'item'),
    ...build(group.application_categories, 'applications', 'category'),
    ...build(group.protocols, 'protocols', 'item'),
    ...build(group.protocol_categories, 'protocols', 'category')
  ]
}

export function groupContentSummary(group: DpiApplicationGroup) {
  return [
    { key: 'n_app_categories', count: group.application_categories.length },
    { key: 'n_protocol_categories', count: group.protocol_categories.length },
    { key: 'n_applications', count: group.applications.length },
    { key: 'n_protocols', count: group.protocols.length }
  ].filter((part) => part.count > 0)
}
