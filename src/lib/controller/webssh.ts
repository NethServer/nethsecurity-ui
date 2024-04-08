//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import axios from 'axios'
import { useDefaultsStore } from '@/stores/controller/defaults'

export interface SshConnectionPayload {
  hostname: string
  port: number
  username: string
  password: string
  passphrase: string
  privatekey: string
  totp: string
  term: string
  _xsrf: string
}

export async function getXsrfToken() {
  const defaultsStore = useDefaultsStore()

  const res = await axios.get(`https://${defaultsStore.fqdn}${defaultsStore.websshPath}`, {
    withCredentials: true
  })

  // retrieve the XSRF token from the response body, it is a hidden input field, e.g.:
  // <input type="hidden" name="_xsrf" value="2|cb6de44d|..."/>
  const parser = new DOMParser()
  const htmlDoc = parser.parseFromString(res.data, 'text/html')
  const xsrfToken = (htmlDoc.getElementsByName('_xsrf')[0] as HTMLInputElement)?.value
  return xsrfToken
}

export async function getWebsocketId(payload: SshConnectionPayload) {
  const defaultsStore = useDefaultsStore()

  const formData = new FormData()
  formData.append('hostname', payload.hostname)
  formData.append('port', payload.port.toString())
  formData.append('username', payload.username)
  formData.append('password', payload.password)
  formData.append('passphrase', payload.passphrase)
  formData.append('privatekey', payload.privatekey)
  formData.append('totp', payload.totp)
  formData.append('term', payload.term)
  formData.append('_xsrf', payload._xsrf)

  const res = await axios.post(
    `https://${defaultsStore.fqdn}${defaultsStore.websshPath}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      withCredentials: true
    }
  )

  // If API call fails returns the reason inside status field
  if (res.data.status) {
    // let's manually raise a 401 error
    throw { response: { status: 401 } }
  }
  return res.data.id
}
