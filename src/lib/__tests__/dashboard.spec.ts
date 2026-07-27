//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { getStatusBadge } from '@/lib/standalone/dashboard'
import { faCheck, faWarning, faXmark } from '@fortawesome/free-solid-svg-icons'

describe('getStatusBadge', () => {
  it('maps ok to a green badge', () => {
    expect(getStatusBadge('ok')).toEqual({
      kind: 'green',
      icon: faCheck,
      textKey: 'standalone.dashboard.active'
    })
  })

  it('maps warning to an amber badge', () => {
    expect(getStatusBadge('warning')).toEqual({
      kind: 'amber',
      icon: faWarning,
      textKey: 'standalone.dashboard.warning'
    })
  })

  it('maps disabled to a gray badge', () => {
    expect(getStatusBadge('disabled')).toEqual({
      kind: 'gray',
      icon: faXmark,
      textKey: 'standalone.dashboard.inactive'
    })
  })

  it('maps error to a rose badge with unknown text', () => {
    expect(getStatusBadge('error')).toEqual({
      kind: 'rose',
      icon: faXmark,
      textKey: 'standalone.dashboard.unknown'
    })
  })

  it('maps null (degraded backend section) to a rose badge with unknown text', () => {
    expect(getStatusBadge(null)).toEqual({
      kind: 'rose',
      icon: faXmark,
      textKey: 'standalone.dashboard.unknown'
    })
  })

  it('maps undefined (data not loaded yet) to a rose badge with unknown text', () => {
    expect(getStatusBadge(undefined)).toEqual({
      kind: 'rose',
      icon: faXmark,
      textKey: 'standalone.dashboard.unknown'
    })
  })
})
