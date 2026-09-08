//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { computed, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faArrowsRotate,
  faBookOpen,
  faBriefcase,
  faBug,
  faBullhorn,
  faCloud,
  faCoins,
  faComments,
  faDesktop,
  faDice,
  faEnvelope,
  faEyeSlash,
  faFolderOpen,
  faFutbol,
  faGamepad,
  faGraduationCap,
  faHashtag,
  faLandmark,
  faLaptopCode,
  faLock,
  faMasksTheater,
  faMicrochip,
  faNewspaper,
  faPersonHiking,
  faPlay,
  faServer,
  faShapes,
  faShareNodes,
  faShieldHalved,
  faTowerCell,
  faVideo,
  faWindowMaximize
} from '@fortawesome/free-solid-svg-icons'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  useNetifydStore,
  type Application,
  type Protocol,
  type Response
} from '@/stores/standalone/netifyd'

export const UNCATEGORIZED = ''

export type DpiCatalogCategory = {
  id: string
  name: string
  icon: IconDefinition
  total: number
  selectable: number
}

export type DpiCatalogItem = {
  id: string
  name: string
  disabled: boolean
  logo?: string
}

const CATEGORY_ICONS: Record<string, IconDefinition> = {
  adult: faEyeSlash,
  advertiser: faBullhorn,
  artsandentertainment: faMasksTheater,
  business: faBriefcase,
  careerandeducation: faGraduationCap,
  cdn: faCloud,
  cybersecurity: faShieldHalved,
  deviceiot: faMicrochip,
  fileserver: faFolderOpen,
  filesharing: faShareNodes,
  financial: faCoins,
  gambling: faDice,
  games: faGamepad,
  government: faLandmark,
  hosting: faServer,
  isptelco: faTowerCell,
  mail: faEnvelope,
  malware: faBug,
  messaging: faComments,
  news: faNewspaper,
  ossoftwareupdates: faArrowsRotate,
  portal: faWindowMaximize,
  recreation: faPersonHiking,
  reference: faBookOpen,
  remotedesktop: faDesktop,
  socialmedia: faHashtag,
  sports: faFutbol,
  streamingmedia: faPlay,
  technology: faLaptopCode,
  voipconferencing: faVideo,
  vpnandproxy: faLock
}

export type DpiCatalogKind = 'applications' | 'protocols'

function categoryIconKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export type DpiCatalogEntry = {
  id: number
  name: string
  label: string
}

type LoadedEntry = {
  id: number
  name: string
}

export const DPI_LOADED_APPLICATIONS_KEY = ['dpi', 'loaded-applications']
export const DPI_LOADED_PROTOCOLS_KEY = ['dpi', 'loaded-protocols']

export function useLoadedApplications() {
  return useQuery({
    queryKey: DPI_LOADED_APPLICATIONS_KEY,
    queryFn: ({ signal }) =>
      ubusCall<Response<LoadedEntry[]>>('ns.dpi', 'list-loaded-applications', {}, { signal }),
    select: (res) => res.data.values,
    staleTime: 5 * 60 * 1000
  })
}

export function useLoadedProtocols() {
  return useQuery({
    queryKey: DPI_LOADED_PROTOCOLS_KEY,
    queryFn: ({ signal }) =>
      ubusCall<Response<LoadedEntry[]>>('ns.dpi', 'list-loaded-protocols', {}, { signal }),
    select: (res) => res.data.values,
    staleTime: 5 * 60 * 1000
  })
}

export function useDpiCatalog(kind: Ref<DpiCatalogKind>, categoryId: Ref<string>) {
  const { t } = useI18n()
  const netifydStore = useNetifydStore()
  const loadedApplications = useLoadedApplications()
  const loadedProtocols = useLoadedProtocols()

  const isApplications = computed(() => kind.value === 'applications')

  const catalogQuery = computed(() =>
    isApplications.value ? netifydStore.applications : netifydStore.protocols
  )
  const loadedQuery = computed(() => (isApplications.value ? loadedApplications : loadedProtocols))

  const loaded = computed(() => loadedQuery.value.data.value ?? [])
  const loadedById = computed(() => new Map(loaded.value.map((entry) => [entry.id, entry.name])))

  type CrossedEntry = DpiCatalogItem & { categoryTag: string; categoryLabel: string }

  const entries = computed<CrossedEntry[]>(() => {
    const catalog = catalogQuery.value.data ?? []

    const visibleCatalog = isApplications.value
      ? catalog.filter((entry) => (entry as Application).active !== false)
      : catalog

    const fromCatalog = visibleCatalog.map((entry) => ({
      id: loadedById.value.get(entry.id) ?? entry.tag,
      name: entry.label,
      logo: (entry as Application).icon,
      disabled: !loadedById.value.has(entry.id),
      categoryTag: entry.category?.tag ?? '',
      categoryLabel: entry.category?.label ?? ''
    }))

    const catalogIds = new Set(catalog.map((entry) => entry.id))
    const unknownToCatalog = loaded.value
      .filter((entry) => !catalogIds.has(entry.id))
      .map((entry) => ({
        id: entry.name,
        name: entry.name,
        disabled: false,
        categoryTag: '',
        categoryLabel: ''
      }))

    const merged = [...fromCatalog, ...unknownToCatalog]

    return isApplications.value
      ? merged
      : merged.filter((entry) => entry.name.toLowerCase() !== 'unknown')
  })

  const entriesByCategory = computed(() => {
    const groups = new Map<string, CrossedEntry[]>()
    for (const entry of entries.value) {
      const group = groups.get(entry.categoryTag)
      if (group) {
        group.push(entry)
      } else {
        groups.set(entry.categoryTag, [entry])
      }
    }
    return groups
  })

  const categories = computed<DpiCatalogCategory[]>(() =>
    [...entriesByCategory.value.entries()]
      .map(([id, group]) => ({
        id,
        name: group[0]!.categoryLabel || t('standalone.dpi.uncategorized'),
        icon: CATEGORY_ICONS[categoryIconKey(group[0]!.categoryLabel)] ?? faShapes,
        total: group.length,
        selectable: group.filter((entry) => !entry.disabled).length
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  )

  function itemsOf(id: string): DpiCatalogItem[] {
    return (entriesByCategory.value.get(id) ?? [])
      .map(({ id: entryId, name, disabled, logo }) => ({ id: entryId, name, disabled, logo }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const items = computed<DpiCatalogItem[]>(() => itemsOf(categoryId.value))

  const isLoading = computed(
    () => catalogQuery.value.isLoading || loadedQuery.value.isLoading.value
  )
  const isError = computed(() => catalogQuery.value.isError || loadedQuery.value.isError.value)
  const error = computed(() => loadedQuery.value.error.value ?? catalogQuery.value.error)

  return { categories, items, itemsOf, isLoading, isError, error }
}

export function useDpiCatalogLabels() {
  const netifydStore = useNetifydStore()
  const loadedApplications = useLoadedApplications()
  const loadedProtocols = useLoadedProtocols()

  function labelByEngineName(
    catalog: (Application | Protocol)[],
    loaded: LoadedEntry[] | undefined
  ) {
    const labels = new Map<string, string>()
    const byId = new Map(catalog.map((entry) => [entry.id, entry]))
    for (const entry of loaded ?? []) {
      const catalogEntry = byId.get(entry.id)
      labels.set(entry.name, catalogEntry?.label ?? entry.name)
    }
    return labels
  }

  function categoryLabels(catalog: (Application | Protocol)[]) {
    const labels = new Map<string, string>()
    for (const entry of catalog) {
      if (entry.category) {
        labels.set(entry.category.tag, entry.category.label)
      }
    }
    return labels
  }

  const applicationLabels = computed(() =>
    labelByEngineName(netifydStore.applications.data ?? [], loadedApplications.data.value)
  )
  const protocolLabels = computed(() =>
    labelByEngineName(netifydStore.protocols.data ?? [], loadedProtocols.data.value)
  )
  const applicationCategoryLabels = computed(() =>
    categoryLabels(netifydStore.applications.data ?? [])
  )
  const protocolCategoryLabels = computed(() => categoryLabels(netifydStore.protocols.data ?? []))

  function categoryByEngineName(
    catalog: (Application | Protocol)[],
    loaded: LoadedEntry[] | undefined
  ) {
    const categories = new Map<string, string>()
    const byId = new Map(catalog.map((entry) => [entry.id, entry]))
    for (const entry of loaded ?? []) {
      categories.set(entry.name, byId.get(entry.id)?.category?.tag ?? UNCATEGORIZED)
    }
    return categories
  }

  const applicationCategoryOf = computed(() =>
    categoryByEngineName(netifydStore.applications.data ?? [], loadedApplications.data.value)
  )
  const protocolCategoryOf = computed(() =>
    categoryByEngineName(netifydStore.protocols.data ?? [], loadedProtocols.data.value)
  )

  function categoryOf(kind: DpiCatalogKind, id: string) {
    const categories =
      kind === 'applications' ? applicationCategoryOf.value : protocolCategoryOf.value
    return categories.get(id) ?? UNCATEGORIZED
  }

  function labelOf(kind: DpiCatalogKind, type: 'item' | 'category', id: string) {
    const labels =
      type === 'category'
        ? kind === 'applications'
          ? applicationCategoryLabels.value
          : protocolCategoryLabels.value
        : kind === 'applications'
          ? applicationLabels.value
          : protocolLabels.value
    return labels.get(id) ?? id
  }

  return { labelOf, categoryOf }
}
