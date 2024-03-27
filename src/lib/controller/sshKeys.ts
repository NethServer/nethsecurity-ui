//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import axios from 'axios'
import { getControllerApiEndpoint } from '../config'
import { useLoginStore } from '@/stores/controller/controllerLogin'

export interface SshKey {
  key: string
  key_pub: string
}

export async function getSshKeys() {
  const loginStore = useLoginStore()

  const res = await axios.get(`${getControllerApiEndpoint()}/accounts/ssh-keys`, {
    headers: {
      Authorization: `Bearer ${loginStore.token}`
    }
  })
  return res.data
}
