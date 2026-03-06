//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import type { Tab } from '@nethesis/vue-components'
import { ref } from 'vue'
import { useRouteQuery } from '@vueuse/router'

/**
 * Composable that handles the state associated to the tabs of a page, binding them to
 * the router's `tab` query string.
 * @param {Tab[]} tabsList - A list containing all the tabs, the first tab will be selected by default.
 * the specified value when the component is mounted. If absent, the first value in `tabsList` will be
 * used instead.
 */
export function useTabs(tabsList: Tab[]) {
  const tabs = ref(tabsList)
  const selectedTab = useRouteQuery('tab', tabs.value[0]?.name ?? '')

  return { tabs, selectedTab }
}
