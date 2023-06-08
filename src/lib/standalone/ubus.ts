//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import axios from 'axios'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

export const ubusCall = async (path: string, method: any, payload: any, skipGetChanges = false) => {
  const loginStore = useLoginStore()

  const res = await axios.post('/ubus/call', { path, method, payload })

  // reload uci pending changes
  if (method !== 'changes' && method !== 'get' && !skipGetChanges) {
    const uciChangesStore = useUciPendingChangesStore()
    uciChangesStore.getChanges()
  }

  return res.data
}

export const getUciConfig = async (config: string) => {
  const res = await ubusCall('uci', 'get', {
    config: config
  })
  const sections = Object.values(res.data.values)
  const outputConfig: any = {}

  sections.forEach((section: any) => {
    const sectionType = section['.type']

    if (!outputConfig[sectionType]) {
      outputConfig[sectionType] = []
    }
    outputConfig[sectionType].push(section)
  })
  return outputConfig
}
