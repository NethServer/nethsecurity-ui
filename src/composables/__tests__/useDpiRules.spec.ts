//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { moveRuleIdToEdge, reorderRuleIds, type DpiRule } from '@/composables/useDpiRules'

function rules(...ids: string[]): DpiRule[] {
  return ids.map((id, index) => ({
    id,
    name: id,
    enabled: true,
    action: 'block',
    source: [],
    appgroups: [],
    managed: true,
    index
  }))
}

const all = rules('a', 'b', 'c', 'd', 'e')

describe('reorderRuleIds', () => {
  it('names every rule exactly once, whatever the move', () => {
    const order = reorderRuleIds(all, 'd', 1)
    expect(order).toHaveLength(all.length)
    expect(new Set(order).size).toBe(all.length)
  })

  it('moves a rule up to the position of the target', () => {
    expect(reorderRuleIds(all, 'd', 1)).toEqual(['a', 'd', 'b', 'c', 'e'])
  })

  it('moves a rule down, accounting for the gap it leaves behind', () => {
    expect(reorderRuleIds(all, 'a', 3)).toEqual(['b', 'c', 'a', 'd', 'e'])
  })

  it('is a no-op when the target is the current position', () => {
    expect(reorderRuleIds(all, 'c', 2)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('clamps a target beyond the end instead of dropping the rule', () => {
    expect(reorderRuleIds(all, 'a', 99)).toEqual(['b', 'c', 'd', 'e', 'a'])
  })

  it('clamps a negative target', () => {
    expect(reorderRuleIds(all, 'e', -3)).toEqual(['e', 'a', 'b', 'c', 'd'])
  })

  it('returns the untouched order for an id that is not in the list', () => {
    expect(reorderRuleIds(all, 'zzz', 0)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('handles a single rule', () => {
    expect(reorderRuleIds(rules('only'), 'only', 0)).toEqual(['only'])
  })
})

describe('moveRuleIdToEdge', () => {
  it('moves to the top without losing or repeating a rule', () => {
    const order = moveRuleIdToEdge(all, 'd', 'top')
    expect(order).toEqual(['d', 'a', 'b', 'c', 'e'])
    expect(new Set(order).size).toBe(all.length)
  })

  it('moves to the bottom', () => {
    expect(moveRuleIdToEdge(all, 'b', 'bottom')).toEqual(['a', 'c', 'd', 'e', 'b'])
  })

  it('is a no-op for a rule already at that edge', () => {
    expect(moveRuleIdToEdge(all, 'a', 'top')).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(moveRuleIdToEdge(all, 'e', 'bottom')).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})
