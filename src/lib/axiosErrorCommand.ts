//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { type AxiosRequestConfig } from 'axios'
import { isEmpty } from 'lodash-es'

// builds the on-device rpcd command to reproduce a failed ns.* ubus call (e.g. over SSH),
// returns undefined for anything else since the curl equivalent would require the auth token
export function getUbusReproductionCommand(config: AxiosRequestConfig): string | undefined {
  if (!config.url?.includes('/ubus/call') || typeof config.data !== 'string') {
    return undefined
  }

  const { path, method, payload } = JSON.parse(config.data)

  if (!/^ns\..+/.test(path)) {
    return undefined
  }

  let command = ''

  if (!isEmpty(payload)) {
    command += `echo '${JSON.stringify(payload)}' | `
  }
  command += `/usr/libexec/rpcd/${path} call ${method}`
  return command
}
