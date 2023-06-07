//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import axios from 'axios'
import { getStandaloneApiEndpoint } from '../config'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'

export const ubusCall = async (path: string, method: any, payload: any) => {
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

  console.log('ubusCall res', res) ////

  return res.data
}
