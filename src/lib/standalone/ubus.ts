//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import axios, { type AxiosRequestConfig } from 'axios'
import { getStandaloneApiEndpoint, getUnitManagementApiEndpoint } from '../config'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import { MessageBag, getValidationErrorsFromAxiosError } from '../validation'
import { useUnitsStore } from '@/stores/controller/units'
import { getJsonFromStorage } from '@nethesis/vue-components'

export class ValidationError extends Error {
  errorBag: MessageBag

  constructor(message: string, errorBag: MessageBag) {
    super(message)
    this.name = this.constructor.name
    this.errorBag = errorBag
  }
}

export const ubusCall = async (
  path: string,
  method: any,
  payload: any = {},
  config?: AxiosRequestConfig
) => {
  const loginStore = useLoginStore()

  try {
    const res = await axios.post(
      `${getStandaloneApiEndpoint()}/ubus/call`,
      { path, method, payload },
      {
        headers: {
          Authorization: `Bearer ${loginStore.token}`
        },
        ...config
      }
    )
    return res.data
  } catch (err: any) {
    const errorBag = getValidationErrorsFromAxiosError(err)

    if (errorBag.size) {
      throw new ValidationError(err.response.data.message, errorBag)
    } else {
      // rethrow the error as-is
      throw err
    }
  }
}

export const ubusCallFromController = async (
  path: string,
  method: any,
  payload: any = {},
  unitId: string,
  config?: AxiosRequestConfig
) => {
  const unitsStore = useUnitsStore()
  let unitToken = ''
  await unitsStore.checkUnitToken(unitId)
  const loginInfo = getJsonFromStorage(`unit-${unitId}`)

  if (loginInfo) {
    unitToken = loginInfo.token
  }

  try {
    const res = await axios.post(
      `${getUnitManagementApiEndpoint(unitId)}/ubus/call`,
      { path, method, payload },
      {
        headers: {
          Authorization: `Bearer ${unitToken}`
        },
        ...config
      }
    )
    return res.data
  } catch (err: any) {
    const errorBag = getValidationErrorsFromAxiosError(err)

    if (errorBag.size) {
      throw new ValidationError(err.response.data.message, errorBag)
    } else {
      // rethrow the error as-is
      throw err
    }
  }
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

export const getUciConfigFromController = async (config: string, unitId: string) => {
  const res = await ubusCallFromController(
    'uci',
    'get',
    {
      config: config
    },
    unitId
  )
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
