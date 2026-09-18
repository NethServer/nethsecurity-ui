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
import { useDpiCatalog, UNCATEGORIZED } from '@/composables/useDpiCatalog'

const mockUbusCall = vi.mocked(ubusCall)

const BUSINESS = { id: 9, label: 'Business', tag: 'business' }

const PROTOCOL_CATALOG = [
  { id: 1, tag: 'http-connect', label: 'HTTP Connect', category: BUSINESS },
  { id: 2, tag: 'ftp-control', label: 'FTP Control', category: BUSINESS },
  { id: 3, tag: 'mystery', label: 'Mystery' }
]
const LOADED_PROTOCOLS = [
  { id: 1, name: 'HTTP/Connect' },
  { id: 3, name: 'MYSTERY' },
  { id: 99, name: 'DATASAVER' },
  { id: 100, name: 'Unknown' }
]
// the catalog wording differs from the translation on purpose: the tag must win
const EDUCATION = { id: 6, label: 'Career & Education (catalog wording)', tag: 'education' }
const MYSTERY = { id: 99, label: 'Mystery Stuff', tag: 'mystery-stuff' }
const APPLICATION_CATALOG = [
  { id: 20, tag: 'netify.amazon', label: 'Amazon', category: BUSINESS },
  { id: 21, tag: 'netify.retired', label: 'Retired App', category: BUSINESS, active: false },
  { id: 22, tag: 'netify.school', label: 'School', category: EDUCATION },
  { id: 23, tag: 'netify.mystery', label: 'Mystery App', category: MYSTERY }
]
const LOADED_APPLICATIONS = [
  { id: 20, name: 'netify.amazon' },
  { id: 21, name: 'netify.retired' }
]

function respond(method: string) {
  const values: Record<string, unknown> = {
    'list-application-catalog': APPLICATION_CATALOG,
    'list-protocol-catalog': PROTOCOL_CATALOG,
    'list-loaded-applications': LOADED_APPLICATIONS,
    'list-loaded-protocols': LOADED_PROTOCOLS
  }
  return { data: { values: values[method] } }
}

type Probe = {
  categories?: { id: string; name: string; selectable: number; icon: string }[]
  items?: { id: string; name: string; disabled: boolean }[]
}

async function runCatalog(kindValue: 'applications' | 'protocols', categoryIdValue: string) {
  mockUbusCall.mockReset()
  mockUbusCall.mockImplementation(async (_path, method) => respond(method))
  const seen: Probe = {}
  const Component = defineComponent({
    setup() {
      const kind = ref(kindValue)
      const categoryId = ref(categoryIdValue)
      const { categories, items } = useDpiCatalog(kind, categoryId)
      return () => {
        seen.categories = categories.value.map(({ id, name, selectable, icon }) => ({
          id,
          name,
          selectable,
          icon: icon.iconName
        }))
        seen.items = items.value.map(({ id, name, disabled }) => ({ id, name, disabled }))
        return h('div')
      }
    }
  })
  const app = createApp(Component)
  app.use(createPinia())
  app.use(createI18n({ legacy: false, locale: 'en', messages: { en } }))
  app.use(VueQueryPlugin)
  app.mount(document.createElement('div'))
  for (let i = 0; i < 20; i++) {
    await nextTick()
    await Promise.resolve()
  }
  await new Promise((resolve) => setTimeout(resolve, 30))
  await nextTick()
  app.unmount()
  return seen
}

describe('useDpiCatalog item ids', () => {
  it('identifies a loaded protocol by its engine name, not the catalog tag', async () => {
    const seen = await runCatalog('protocols', 'business')
    const loaded = seen.items!.find((item) => !item.disabled)
    expect(loaded).toEqual({ id: 'HTTP/Connect', name: 'HTTP Connect', disabled: false })
  })

  it('leaves the catalog tag on entries the engine has not loaded, and disables them', async () => {
    const seen = await runCatalog('protocols', 'business')
    const notLoaded = seen.items!.find((item) => item.name === 'FTP Control')
    expect(notLoaded).toEqual({ id: 'ftp-control', name: 'FTP Control', disabled: true })
  })

  it('keys applications the same way, where tag and engine name coincide', async () => {
    const seen = await runCatalog('applications', 'business')
    expect(seen.items).toEqual([{ id: 'netify.amazon', name: 'Amazon', disabled: false }])
  })
})

describe('useDpiCatalog uncategorized group', () => {
  it('merges catalog entries with no category and entries the catalog does not know at all', async () => {
    const seen = await runCatalog('protocols', UNCATEGORIZED)
    const uncategorized = seen.categories!.find((category) => category.id === UNCATEGORIZED)
    expect(uncategorized).toBeDefined()
    expect(uncategorized!.selectable).toBe(2)
    expect(seen.items).toEqual([
      { id: 'DATASAVER', name: 'DATASAVER', disabled: false },
      { id: 'MYSTERY', name: 'Mystery', disabled: false }
    ])
  })

  it('leaves a real category its selectable count', async () => {
    const seen = await runCatalog('protocols', 'business')
    const business = seen.categories!.find((category) => category.id === 'business')
    expect(business!.selectable).toBe(1)
  })
})

describe('useDpiCatalog inactive applications', () => {
  it('never shows an application the catalog marks inactive, even if the engine has loaded it', async () => {
    const seen = await runCatalog('applications', 'business')
    expect(seen.items).toEqual([{ id: 'netify.amazon', name: 'Amazon', disabled: false }])
  })
})

describe('useDpiCatalog unclassified protocol', () => {
  it('never shows the engine catch-all for unclassified traffic', async () => {
    const seen = await runCatalog('protocols', UNCATEGORIZED)
    expect(seen.items!.some((item) => item.name.toLowerCase() === 'unknown')).toBe(false)
  })
})

describe('useDpiCatalog category labels and icons', () => {
  it('translates a category from its tag, ignoring the English catalog label', async () => {
    const seen = await runCatalog('applications', 'education')
    const education = seen.categories!.find((category) => category.id === 'education')
    expect(education).toMatchObject({ name: 'Career and Education', icon: 'graduation-cap' })
  })

  it('falls back to the catalog label and to the protocol icon for an unknown tag', async () => {
    const seen = await runCatalog('applications', 'mystery-stuff')
    const mystery = seen.categories!.find((category) => category.id === 'mystery-stuff')
    expect(mystery).toMatchObject({ name: 'Mystery Stuff', icon: 'cubes' })
  })
})
