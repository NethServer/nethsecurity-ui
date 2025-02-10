//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import axios from 'axios'
import { getControllerApiEndpoint, getStandaloneApiEndpoint, isStandaloneMode } from '@/lib/config'
import { useLoginStore as useStandaloneLoginStore } from '@/stores/standalone/standaloneLogin'
import { useLoginStore as useControllerLoginStore } from '@/stores/controller/controllerLogin'
import { getValidationErrorsFromAxiosError } from '@/lib/validation'
import { ValidationError } from '@/lib/standalone/ubus'

export type TwoFaStatus = {
  data: {
    enabled: boolean
  }
}

export async function getTwoFaStatus() {
  const loginStore = isStandaloneMode() ? useStandaloneLoginStore() : useControllerLoginStore()
  const endpoint = isStandaloneMode() ? getStandaloneApiEndpoint() : getControllerApiEndpoint()
  const res = await axios.get<TwoFaStatus>(`${endpoint}/2fa`, {
    headers: {
      Authorization: `Bearer ${loginStore.token}`
    }
  })
  return res.data
}

export async function getTwoFaQrCode() {
  const loginStore = isStandaloneMode() ? useStandaloneLoginStore() : useControllerLoginStore()
  const endpoint = isStandaloneMode() ? getStandaloneApiEndpoint() : getControllerApiEndpoint()
  const res = await axios.get(`${endpoint}/2fa/qr-code`, {
    headers: {
      Authorization: `Bearer ${loginStore.token}`
    }
  })
  return res.data
}

export type VerifyTwoFaOtpResponse = {
  data: {
    recovery_codes: string[]
  }
}

export async function verifyTwoFaOtp(otp: string) {
  const loginStore = isStandaloneMode() ? useStandaloneLoginStore() : useControllerLoginStore()
  const endpoint = isStandaloneMode() ? getStandaloneApiEndpoint() : getControllerApiEndpoint()
  try {
    const res = await axios.post<VerifyTwoFaOtpResponse>(
      `${endpoint}/2fa`,
      {
        otp: otp
      },
      {
        headers: {
          Authorization: `Bearer ${loginStore.token}`
        }
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

export async function revokeTwoFa() {
  const loginStore = isStandaloneMode() ? useStandaloneLoginStore() : useControllerLoginStore()
  const endpoint = isStandaloneMode() ? getStandaloneApiEndpoint() : getControllerApiEndpoint()
  try {
    const res = await axios.delete(`${endpoint}/2fa`, {
      headers: {
        Authorization: `Bearer ${loginStore.token}`
      }
    })
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
