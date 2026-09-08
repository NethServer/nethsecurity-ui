//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import {
  groupContentSummary,
  selectionsFromGroup,
  selectionsToPayload,
  type DpiApplicationGroup,
  type DpiGroupSelection,
  type DpiMemberResolver
} from '@/composables/useApplicationGroups'

function selection(over: Partial<DpiGroupSelection>): DpiGroupSelection {
  return { type: 'item', kind: 'applications', id: 'x', name: 'X', categoryId: 'c', ...over }
}

describe('selectionsToPayload', () => {
  it('always sends the four lists, so edit does not keep stale members', () => {
    expect(selectionsToPayload('empty', [])).toEqual({
      name: 'empty',
      applications: [],
      application_categories: [],
      protocols: [],
      protocol_categories: []
    })
  })

  it('splits the four kinds of member into their own list', () => {
    const payload = selectionsToPayload('mixed', [
      selection({ kind: 'applications', type: 'item', id: 'netify.amazon' }),
      selection({ kind: 'applications', type: 'category', id: 'cybersecurity' }),
      selection({ kind: 'protocols', type: 'item', id: 'HTTP/Connect' }),
      selection({ kind: 'protocols', type: 'category', id: 'games' })
    ])
    expect(payload).toEqual({
      name: 'mixed',
      applications: ['netify.amazon'],
      application_categories: ['cybersecurity'],
      protocols: ['HTTP/Connect'],
      protocol_categories: ['games']
    })
  })

  it('sends the id, not the label: the backend matches on the engine name', () => {
    const payload = selectionsToPayload('p', [
      selection({ kind: 'protocols', type: 'item', id: 'HTTP/Connect', name: 'HTTP Connect' })
    ])
    expect(payload.protocols).toEqual(['HTTP/Connect'])
  })

  it('keeps duplicates apart when the same id exists in both tabs', () => {
    const payload = selectionsToPayload('g', [
      selection({ kind: 'applications', type: 'category', id: 'games' }),
      selection({ kind: 'protocols', type: 'category', id: 'games' })
    ])
    expect(payload.application_categories).toEqual(['games'])
    expect(payload.protocol_categories).toEqual(['games'])
  })
})

describe('selectionsFromGroup', () => {
  const group: DpiApplicationGroup = {
    id: 'ns_1',
    name: 'Group',
    applications: ['netify.amazon', 'netify.gone'],
    application_categories: ['cybersecurity'],
    protocols: ['HTTP/Connect'],
    protocol_categories: ['games'],
    used: false,
    matches: []
  }

  const resolver: DpiMemberResolver = {
    labelOf: (kind, type, id) => {
      const known: Record<string, string> = {
        'applications:item:netify.amazon': 'Amazon',
        'applications:category:cybersecurity': 'Cybersecurity',
        'protocols:item:HTTP/Connect': 'HTTP Connect',
        'protocols:category:games': 'Games'
      }
      return known[`${kind}:${type}:${id}`] ?? id
    },
    categoryOf: (_kind, id) => (id === 'netify.amazon' ? 'business' : '')
  }

  it('round trips through the payload without losing a member', () => {
    const selections = selectionsFromGroup(group, resolver)
    const payload = selectionsToPayload(group.name, selections)
    expect(payload).toEqual({
      name: group.name,
      applications: group.applications,
      application_categories: group.application_categories,
      protocols: group.protocols,
      protocol_categories: group.protocol_categories
    })
  })

  it('keeps a member the catalog does not know, labelled with its stored value', () => {
    const selections = selectionsFromGroup(group, resolver)
    const orphan = selections.find((s) => s.id === 'netify.gone')
    expect(orphan).toBeDefined()
    expect(orphan!.name).toBe('netify.gone')
  })

  it('resolves the category of an entry, and uses the tag itself for a category', () => {
    const selections = selectionsFromGroup(group, resolver)
    expect(selections.find((s) => s.id === 'netify.amazon')!.categoryId).toBe('business')
    expect(selections.find((s) => s.id === 'cybersecurity')!.categoryId).toBe('cybersecurity')
  })

  it('returns nothing for a group with no members', () => {
    const empty = {
      ...group,
      applications: [],
      application_categories: [],
      protocols: [],
      protocol_categories: []
    }
    expect(selectionsFromGroup(empty, resolver)).toEqual([])
  })
})

const nameSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'name_required'),
    v.maxLength(64, 'name_too_long')
  )
})

describe('group name schema', () => {
  it.each([
    ['', false],
    ['   ', false],
    ['a', true],
    ['a'.repeat(64), true],
    ['a'.repeat(65), false]
  ])('%j → valid: %s', (name, expected) => {
    expect(v.safeParse(nameSchema, { name }).success).toBe(expected)
  })

  it('reports the message id the i18n keys are named after', () => {
    const empty = v.safeParse(nameSchema, { name: '' })
    expect(empty.issues?.[0]?.message).toBe('name_required')
    const long = v.safeParse(nameSchema, { name: 'a'.repeat(65) })
    expect(long.issues?.[0]?.message).toBe('name_too_long')
  })

  it('trims before measuring, so trailing spaces do not pass the limit', () => {
    expect(v.safeParse(nameSchema, { name: `${'a'.repeat(64)}   ` }).success).toBe(true)
  })
})

describe('groupContentSummary', () => {
  const group = (over: Partial<DpiApplicationGroup> = {}): DpiApplicationGroup => ({
    id: 'ns_1',
    name: 'G',
    applications: [],
    application_categories: [],
    protocols: [],
    protocol_categories: [],
    used: false,
    matches: [],
    ...over
  })

  it('lists the parts in the order the design shows them', () => {
    expect(
      groupContentSummary(
        group({
          applications: ['a1', 'a2'],
          application_categories: ['c1'],
          protocols: ['p1'],
          protocol_categories: ['pc1']
        })
      )
    ).toEqual([
      { key: 'n_app_categories', count: 1 },
      { key: 'n_protocol_categories', count: 1 },
      { key: 'n_applications', count: 2 },
      { key: 'n_protocols', count: 1 }
    ])
  })

  it('leaves out the parts with no members, so the line has no empty pieces', () => {
    expect(groupContentSummary(group({ applications: ['a1'] }))).toEqual([
      { key: 'n_applications', count: 1 }
    ])
  })

  it('returns nothing for a group with no members at all', () => {
    expect(groupContentSummary(group())).toEqual([])
  })
})
