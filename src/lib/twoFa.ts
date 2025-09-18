//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import axios from 'axios'
import { getControllerApiEndpoint, getStandaloneApiEndpoint, isStandaloneMode } from '@/lib/config'
import { useLoginStore as useStandaloneLoginStore } from '@/stores/standalone/standaloneLogin'
import { useLoginStore as useControllerLoginStore } from '@/stores/controller/controllerLogin'
import { getValidationErrorsFromAxiosError } from '@/lib/validation'
import { ValidationError } from '@/lib/standalone/ubus'

export async function getTwoFaStatus() {
  let url: string
  let loginStore:
    | ReturnType<typeof useStandaloneLoginStore>
    | ReturnType<typeof useControllerLoginStore>
  if (isStandaloneMode()) {
    loginStore = useStandaloneLoginStore()
    url = `${getStandaloneApiEndpoint()}/2fa`
  } else {
    loginStore = useControllerLoginStore()
    url = `${getControllerApiEndpoint()}/2fa/status`
  }
  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${loginStore.token}`
    }
  })
  return res.data
}

export async function getTwoFaQrCode() {
  let url: string
  let loginStore:
    | ReturnType<typeof useStandaloneLoginStore>
    | ReturnType<typeof useControllerLoginStore>
  if (isStandaloneMode()) {
    loginStore = useStandaloneLoginStore()
    url = `${getStandaloneApiEndpoint()}/2fa/qr-code`
  } else {
    loginStore = useControllerLoginStore()
    url = `${getControllerApiEndpoint()}/2fa/secret`
  }
  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${loginStore.token}`
    }
  })
  return res.data
}

export async function enableTwoFaOtpController(username: string, token: string, otp: string) {
  const endpoint = getControllerApiEndpoint()
  const loginStore = useControllerLoginStore()
  try {
    const headers = { Authorization: `Bearer ${loginStore.token}` }
    const res = await axios.put(
      `${endpoint}/2fa/secret`,
      {
        otp
      },
      {
        headers
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

export async function cancelTwoFaSetupController() {
  const endpoint = getControllerApiEndpoint()
  const loginStore = useControllerLoginStore()
  try {
    const res = await axios.delete(`${endpoint}/2fa/secret`, {
      headers: {
        Authorization: `Bearer ${loginStore.token}`
      }
    })
    return res.data
  } catch (err: any) {
    throw err
  }
}

export async function verifyTwoFaOtp(username: string, token: string, otp: string) {
  const endpoint = isStandaloneMode() ? getStandaloneApiEndpoint() : getControllerApiEndpoint()
  try {
    const res = await axios.post(`${endpoint}/2fa/otp-verify`, {
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
  let url: string
  let loginStore:
    | ReturnType<typeof useStandaloneLoginStore>
    | ReturnType<typeof useControllerLoginStore>
  if (isStandaloneMode()) {
    loginStore = useStandaloneLoginStore()
    url = `${getStandaloneApiEndpoint()}/2fa`
  } else {
    loginStore = useControllerLoginStore()
    url = `${getControllerApiEndpoint()}/2fa/status`
  }
  try {
    const res = await axios.delete(url, {
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
