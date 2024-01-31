//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import axios from 'axios'
import { getStandaloneApiEndpoint } from '../config'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import { getValidationErrorsFromAxiosError } from '../validation'
import { ValidationError } from './ubus'

export async function getTwoFaStatus() {
  const loginStore = useLoginStore()
  const res = await axios.get(`${getStandaloneApiEndpoint()}/2fa`, {
    headers: {
      Authorization: `Bearer ${loginStore.token}`
    }
  })
  return res.data
}

export async function getTwoFaQrCode() {
  const loginStore = useLoginStore()
  const res = await axios.get(`${getStandaloneApiEndpoint()}/2fa/qr-code`, {
    headers: {
      Authorization: `Bearer ${loginStore.token}`
    }
  })
  return res.data
}

export async function verifyTwoFaOtp(username: string, token: string, otp: string) {
  try {
    const res = await axios.post(`${getStandaloneApiEndpoint()}/2fa/otp-verify`, {
      otp,
      username,
      token
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

export async function revokeTwoFa() {
  const loginStore = useLoginStore()

  try {
    const res = await axios.delete(`${getStandaloneApiEndpoint()}/2fa`, {
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
