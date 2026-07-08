//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { faCheck, faWarning, faXmark, type IconDefinition } from '@fortawesome/free-solid-svg-icons'
import type { NeBadgeV2Kind } from '@nethesis/vue-components'
import type { ServiceStatus } from '@/composables/useDashboardOverview'

export type StatusBadge = {
  kind: NeBadgeV2Kind
  icon: IconDefinition
  // i18n key, to be translated by the consuming component
  textKey: string
}

export function getStatusBadge(status: ServiceStatus | undefined): StatusBadge {
  switch (status) {
    case 'ok':
      return { kind: 'green', icon: faCheck, textKey: 'standalone.dashboard.active' }
    case 'warning':
      return { kind: 'amber', icon: faWarning, textKey: 'standalone.dashboard.warning' }
    case 'disabled':
      return { kind: 'gray', icon: faXmark, textKey: 'standalone.dashboard.inactive' }
    default:
      return { kind: 'rose', icon: faXmark, textKey: 'standalone.dashboard.unknown' }
  }
}
