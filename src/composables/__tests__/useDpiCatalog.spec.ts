//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { VueQueryPlugin } from '@tanstack/vue-query'
import en from '@/i18n/en.json'

vi.mock('@/lib/standalone/ubus.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/standalone/ubus.ts')>()
  return { ...original, ubusCall: vi.fn() }
})
vi.mock('@/lib/standalone/ubus', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/standalone/ubus')>()
  return { ...original, ubusCall: vi.fn() }
})

import { ubusCall } from '@/lib/standalone/ubus'
import {
  useDpiCatalog,
  useDpiCatalogLabels,
  UNCATEGORIZED,
  type DpiCatalogKind
} from '@/composables/useDpiCatalog'

const mockUbusCall = vi.mocked(ubusCall)

// the catalog wording differs from the translation on purpose: the tag must win
const CATALOG = {
  applications: [
    {
      tag: 'education',
      label: 'Career & Education (catalog wording)',
      selectable: true,
      items: [
        {
          id: 'netify.school',
          label: 'School',
          selectable: true,
          logo: 'https://static.netify.ai/logos/s/school.png'
        },
        { id: 'netify.amazon', label: 'Amazon', selectable: true }
      ]
    },
    {
      tag: 'mystery-stuff',
      label: 'Mystery Stuff',
      selectable: true,
      items: [{ id: 'netify.premium-only', label: 'Premium Only', selectable: false }]
    },
    {
      tag: '',
      label: '',
      selectable: false,
      items: [{ id: 'netify.brand-new', label: 'netify.brand-new', selectable: true }]
    }
  ],
  protocols: [
    {
      tag: 'business',
      label: 'Business',
      selectable: true,
      items: [
        { id: 'HTTP/Connect', label: 'HTTP Connect', selectable: true },
        { id: 'ftp-control', label: 'FTP Control', selectable: false }
      ]
    }
  ]
}

type Probe = {
  categories?: {
    id: string
    name: string
    total: number
    selectable: number
    selectableAsMember: boolean
    icon: string
  }[]
  items?: { id: string; name: string; disabled: boolean; logo?: string }[]
  isError?: boolean
  labels?: Record<string, string>
}

async function settle(app: ReturnType<typeof createApp>) {
  for (let i = 0; i < 20; i++) {
    await nextTick()
    await Promise.resolve()
  }
  await new Promise((resolve) => setTimeout(resolve, 30))
  await nextTick()
  app.unmount()
}

async function runCatalog(kindValue: DpiCatalogKind, categoryIdValue: string, failing = false) {
  mockUbusCall.mockReset()
  mockUbusCall.mockImplementation(async () => {
    if (failing) {
      throw new Error('catalog_not_available')
    }
    return { data: { values: CATALOG } }
  })

  const seen: Probe = {}
  const Component = defineComponent({
    setup() {
      const kind = ref(kindValue)
      const categoryId = ref(categoryIdValue)
      const { categories, items, isError } = useDpiCatalog(kind, categoryId)
      const { labelOf, categoryOf, isLoaded } = useDpiCatalogLabels()
      return () => {
        seen.categories = categories.value.map(
          ({ id, name, total, selectable, selectableAsMember, icon }) => ({
            id,
            name,
            total,
            selectable,
            selectableAsMember,
            icon: icon.iconName
          })
        )
        seen.items = items.value.map(({ id, name, disabled, logo }) => ({
          id,
          name,
          disabled,
          logo
        }))
        seen.isError = isError.value
        seen.labels = {
          item: labelOf(kindValue, 'item', 'netify.school'),
          unknownItem: labelOf(kindValue, 'item', 'netify.gone'),
          category: labelOf(kindValue, 'category', 'education'),
          categoryOfItem: categoryOf(kindValue, 'netify.school'),
          categoryOfUnknown: categoryOf(kindValue, 'netify.gone'),
          loaded: String(isLoaded(kindValue, 'netify.school')),
          notLoaded: String(isLoaded(kindValue, 'netify.premium-only'))
        }
        return h('div')
      }
    }
  })

  const app = createApp(Component)
  app.use(createPinia())
  app.use(createI18n({ legacy: false, locale: 'en', messages: { en } }))
  app.use(VueQueryPlugin, {
    queryClientConfig: { defaultOptions: { queries: { retry: false } } }
  })
  app.mount(document.createElement('div'))
  await settle(app)
  return seen
}

describe('useDpiCatalog items', () => {
  it('takes the id, the label and the logo the firewall already crossed', async () => {
    const seen = await runCatalog('applications', 'education')
    expect(seen.items).toEqual([
      { id: 'netify.amazon', name: 'Amazon', disabled: false, logo: undefined },
      {
        id: 'netify.school',
        name: 'School',
        disabled: false,
        logo: 'https://static.netify.ai/logos/s/school.png'
      }
    ])
  })

  it('disables an item the engine cannot match', async () => {
    const seen = await runCatalog('applications', 'mystery-stuff')
    expect(seen.items).toEqual([
      { id: 'netify.premium-only', name: 'Premium Only', disabled: true, logo: undefined }
    ])
  })

  it('keeps protocols apart from applications', async () => {
    const seen = await runCatalog('protocols', 'business')
    expect(seen.items).toEqual([
      { id: 'ftp-control', name: 'FTP Control', disabled: true, logo: undefined },
      { id: 'HTTP/Connect', name: 'HTTP Connect', disabled: false, logo: undefined }
    ])
  })
})

describe('useDpiCatalog categories', () => {
  it('counts the items the engine can match, apart from the total', async () => {
    const seen = await runCatalog('applications', 'education')
    expect(seen.categories).toContainEqual({
      id: 'mystery-stuff',
      name: 'Mystery Stuff',
      total: 1,
      selectable: 0,
      selectableAsMember: true,
      icon: 'cubes'
    })
  })

  it('translates a category from its tag, ignoring the English catalog label', async () => {
    const seen = await runCatalog('applications', 'education')
    expect(seen.categories).toContainEqual({
      id: 'education',
      name: 'Career and Education',
      total: 2,
      selectable: 2,
      selectableAsMember: true,
      icon: 'graduation-cap'
    })
  })

  it('marks the group without a tag as no member of its own, and names it', async () => {
    const seen = await runCatalog('applications', UNCATEGORIZED)
    const uncategorized = seen.categories!.find((category) => category.id === UNCATEGORIZED)
    expect(uncategorized).toEqual({
      id: UNCATEGORIZED,
      name: 'Uncategorized',
      total: 1,
      selectable: 1,
      selectableAsMember: false,
      icon: 'cubes'
    })
    expect(seen.items).toEqual([
      { id: 'netify.brand-new', name: 'netify.brand-new', disabled: false, logo: undefined }
    ])
  })

  it('sorts the categories by their translated name', async () => {
    const seen = await runCatalog('applications', 'education')
    expect(seen.categories!.map((category) => category.name)).toEqual([
      'Career and Education',
      'Mystery Stuff',
      'Uncategorized'
    ])
  })
})

describe('useDpiCatalogLabels', () => {
  it('resolves saved members from the same catalog, and falls back to the id', async () => {
    const seen = await runCatalog('applications', 'education')
    expect(seen.labels).toEqual({
      item: 'School',
      unknownItem: 'netify.gone',
      category: 'Career and Education',
      categoryOfItem: 'education',
      categoryOfUnknown: UNCATEGORIZED,
      loaded: 'true',
      notLoaded: 'false'
    })
  })
})

describe('useDpiCatalog error', () => {
  it('reports the failure instead of an empty catalog', async () => {
    const seen = await runCatalog('applications', 'education', true)
    expect(seen.isError).toBe(true)
    expect(seen.categories).toEqual([])
    expect(seen.items).toEqual([])
  })
})
