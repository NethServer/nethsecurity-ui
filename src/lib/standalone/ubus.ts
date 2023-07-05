//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import axios from 'axios'
import { getStandaloneApiEndpoint } from '../config'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'

export const ubusCall = async (path: string, method: any, payload: any = {}) => {
  const loginStore = useLoginStore()

  const res = await axios.post(
    `${getStandaloneApiEndpoint()}/ubus/call`,
    { path, method, payload },
    {
      headers: {
        Authorization: `Bearer ${loginStore.token}`
      }
    }
  )
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
