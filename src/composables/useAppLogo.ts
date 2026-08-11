//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import logoLight from '@/assets/logo_light.svg'
import logoDark from '@/assets/logo_dark.svg'

export function useAppLogo() {
  const themeStore = useThemeStore()
  const logoUrl = computed(() => (themeStore.isLight ? logoLight : logoDark))
  return { logoUrl }
}
