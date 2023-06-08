//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import axios from 'axios'
import { getStandaloneApiEndpoint } from '../config'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

export const ubusCall = async (path: string, method: any, payload: any, skipGetChanges = false) => {
  console.log('ubusCall', path, method, payload) ////

  const loginStore = useLoginStore()

  const res = await axios.post(
    `${getStandaloneApiEndpoint()}/ubus/call`,
    { path, method, payload },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginStore.token}`
      }
    }
  )

  console.log('ubusCall res data', res.data) ////

  // reload uci pending changes
  if (method !== 'changes' && method !== 'get' && !skipGetChanges) {
    const uciChangesStore = useUciPendingChangesStore()
    uciChangesStore.getChanges()
  }

  return res.data
}
