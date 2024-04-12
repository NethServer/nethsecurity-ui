//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import type { Tab } from '@nethesis/vue-components'
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * Composable that handles the state associated to the tabs of a page, binding them to
 * the router's `tab` query string.
 * @param {Tab[]} tabsList - A list containing all the tabs.
 * @param {string} [initialTabName] - If present, `selectedTab` will be set to
 * the specified value when the component is mounted. If absent, the first value in `tabsList` will be
 * used instead.
 */
export function useTabs(tabsList: Tab[], initialTabName?: string) {
  const route = useRoute()
  const router = useRouter()

  const tabs = ref(tabsList)
  const selectedTab = ref('')
  const currentPath = route.path

  watch(
    () => route.query.tab,
    () => {
      if (route.path === currentPath) {
        selectedTab.value =
          (route.query.tab as string) ??
          initialTabName ??
          (tabs.value.length > 0 ? tabs.value[0].name : '')
      }
    },
    { immediate: true }
  )

  watch(selectedTab, () => {
    router.push({ path: route.path, query: { tab: selectedTab.value } })
  })

  return { tabs, selectedTab }
}
