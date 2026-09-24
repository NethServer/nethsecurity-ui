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
  faCartShopping,
  faCloud,
  faCoins,
  faComments,
  faCubes,
  faDatabase,
  faDesktop,
  faDice,
  faEnvelope,
  faEyeSlash,
  faFolderOpen,
  faFutbol,
  faGamepad,
  faGlobe,
  faGraduationCap,
  faHashtag,
  faKey,
  faLandmark,
  faLaptopCode,
  faLock,
  faMasksTheater,
  faMicrochip,
  faNetworkWired,
  faNewspaper,
  faPersonHiking,
  faPhotoFilm,
  faPlay,
  faPrint,
  faRightLeft,
  faServer,
  faShareNodes,
  faShieldHalved,
  faSitemap,
  faTowerCell,
  faTv,
  faVideo,
  faWindowMaximize
} from '@fortawesome/free-solid-svg-icons'
import { ubusCall } from '@/lib/standalone/ubus'
import type { Response } from '@/stores/standalone/netifyd'

export const UNCATEGORIZED = ''

type DpiCatalogCategory = {
  id: string
  name: string
  icon: IconDefinition
  total: number
  selectable: number
  selectableAsMember: boolean
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
  authentication: faKey,
  business: faBriefcase,
  cdn: faCloud,
  cybersecurity: faShieldHalved,
  database: faDatabase,
  'device-iot': faMicrochip,
  education: faGraduationCap,
  entertainment: faMasksTheater,
  'file-server': faFolderOpen,
  'file-sharing': faShareNodes,
  financial: faCoins,
  gambling: faDice,
  games: faGamepad,
  government: faLandmark,
  hosting: faServer,
  infrastructure: faSitemap,
  mail: faEnvelope,
  malware: faBug,
  media: faPhotoFilm,
  'media-provider': faTv,
  messaging: faComments,
  networking: faNetworkWired,
  news: faNewspaper,
  'os-software-updates': faArrowsRotate,
  portal: faWindowMaximize,
  printing: faPrint,
  proxy: faRightLeft,
  recreation: faPersonHiking,
  reference: faBookOpen,
  'remote-desktop': faDesktop,
  shopping: faCartShopping,
  'social-media': faHashtag,
  sports: faFutbol,
  'streaming-media': faPlay,
  technology: faLaptopCode,
  telco: faTowerCell,
  voip: faVideo,
  vpn: faLock,
  'vpn-and-proxy': faLock,
  web: faGlobe
}

// a category the engine adds later borrows the icon protocols use
const DEFAULT_CATEGORY_ICON = faCubes

export type DpiCatalogKind = 'applications' | 'protocols'

/**
 * The catalog only carries English labels, so the tag drives the translation and
 * the label is kept as the fallback for categories the engine adds later on.
 */
function useCategoryLabel() {
  const { t, te } = useI18n()

  return function categoryLabel(tag: string, fallback: string) {
    if (tag === UNCATEGORIZED) {
      return t('standalone.dpi.uncategorized')
    }
    const key = `standalone.dpi.category_${tag}`
    return te(key) ? t(key) : fallback
  }
}

export const DPI_APPGROUP_CATALOG_KEY = ['dpi', 'appgroup-catalog']

type CatalogItem = {
  id: string
  label: string
  selectable: boolean
  logo?: string
}

type CatalogGroup = {
  tag: string
  label: string
  selectable: boolean
  items: CatalogItem[]
}

type AppgroupCatalog = {
  applications: CatalogGroup[]
  protocols: CatalogGroup[]
}

function useAppgroupCatalog() {
  return useQuery({
    queryKey: DPI_APPGROUP_CATALOG_KEY,
    queryFn: ({ signal }) =>
      ubusCall<Response<AppgroupCatalog>>('ns.dpi', 'list-appgroup-catalog', {}, { signal }),
    select: (res) => res.data.values,
    staleTime: 5 * 60 * 1000
  })
}

function toItem(item: CatalogItem): DpiCatalogItem {
  return { id: item.id, name: item.label, disabled: !item.selectable, logo: item.logo }
}

function byName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name)
}

export function useDpiCatalog(kind: Ref<DpiCatalogKind>, categoryId: Ref<string>) {
  const categoryLabel = useCategoryLabel()
  const catalog = useAppgroupCatalog()

  const groups = computed<CatalogGroup[]>(() => catalog.data.value?.[kind.value] ?? [])

  const itemsByCategory = computed(() => {
    const byCategory = new Map<string, DpiCatalogItem[]>()
    for (const group of groups.value) {
      byCategory.set(group.tag, group.items.map(toItem).sort(byName))
    }
    return byCategory
  })

  const categories = computed<DpiCatalogCategory[]>(() =>
    groups.value
      .map((group) => ({
        id: group.tag,
        name: categoryLabel(group.tag, group.label),
        icon: CATEGORY_ICONS[group.tag] ?? DEFAULT_CATEGORY_ICON,
        total: group.items.length,
        selectable: group.items.filter((item) => item.selectable).length,
        selectableAsMember: group.selectable
      }))
      .sort(byName)
  )

  function itemsOf(id: string): DpiCatalogItem[] {
    return itemsByCategory.value.get(id) ?? []
  }

  const items = computed<DpiCatalogItem[]>(() => itemsOf(categoryId.value))

  return {
    categories,
    items,
    itemsByCategory,
    itemsOf,
    isLoading: catalog.isLoading,
    isError: catalog.isError,
    error: catalog.error
  }
}

type CatalogIndex = {
  itemLabels: Map<string, string>
  itemCategories: Map<string, string>
  categoryLabels: Map<string, string>
  selectableItems: Set<string>
}

function indexGroups(groups: CatalogGroup[]): CatalogIndex {
  const index: CatalogIndex = {
    itemLabels: new Map(),
    itemCategories: new Map(),
    categoryLabels: new Map(),
    selectableItems: new Set()
  }

  for (const group of groups) {
    index.categoryLabels.set(group.tag, group.label)
    for (const item of group.items) {
      index.itemLabels.set(item.id, item.label)
      index.itemCategories.set(item.id, group.tag)
      if (item.selectable) {
        index.selectableItems.add(item.id)
      }
    }
  }

  return index
}

export function useDpiCatalogLabels() {
  const categoryLabel = useCategoryLabel()
  const catalog = useAppgroupCatalog()

  const indexes = computed<Record<DpiCatalogKind, CatalogIndex>>(() => ({
    applications: indexGroups(catalog.data.value?.applications ?? []),
    protocols: indexGroups(catalog.data.value?.protocols ?? [])
  }))

  function labelOf(kind: DpiCatalogKind, type: 'item' | 'category', id: string) {
    const index = indexes.value[kind]
    if (type === 'category') {
      return categoryLabel(id, index.categoryLabels.get(id) ?? id)
    }
    return index.itemLabels.get(id) ?? id
  }

  function categoryOf(kind: DpiCatalogKind, id: string) {
    return indexes.value[kind].itemCategories.get(id) ?? UNCATEGORIZED
  }

  function isLoaded(kind: DpiCatalogKind, id: string) {
    return indexes.value[kind].selectableItems.has(id)
  }

  return { labelOf, categoryOf, isLoaded }
}
