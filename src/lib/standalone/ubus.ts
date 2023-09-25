//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import axios from 'axios'
import { getStandaloneApiEndpoint } from '../config'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import { MessageBag } from '../validation'

type ValidationError = {
  message: string
  parameter: string
  value: string
}

export class NeValidationError extends Error {
  errorBag: MessageBag

  constructor(message: string, errorBag: MessageBag) {
    super(message)
    this.name = this.constructor.name
    this.errorBag = errorBag
  }
}

export const ubusCall = async (path: string, method: any, payload: any = {}) => {
  const loginStore = useLoginStore()

  try {
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
  } catch (err: any) {
    const validationErrors = err.response?.data?.data?.validation?.errors

    if (validationErrors?.length) {
      // it's an error validation
      const errorBag = new MessageBag()
      validationErrors.forEach((validationError: ValidationError) => {
        const errorMessages = errorBag.get(validationError.parameter) || []
        errorMessages.push(validationError.message)
        errorBag.set(validationError.parameter, errorMessages)
      })
      throw new NeValidationError(err.response.data.message, errorBag)
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
