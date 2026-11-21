//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import { useLoginStore } from '@/stores/standalone/standaloneLogin.ts'

export type AccountInfo = {
  is_superuser: boolean
  default_password: boolean
  ordinary_admins: number
}

type AccountInfoResponse = {
  data: AccountInfo
}

/** Query options for ns.account get-info, shared by the router guard and useAccountInfo */
export function accountInfoQueryOptions(username: string) {
  return {
    queryKey: ['account', 'info', username],
    queryFn: () => ubusCall<AccountInfoResponse>('ns.account', 'get-info'),
    // it changes only when the logged user changes, which is part of the key
    staleTime: Infinity
  }
}

export function useAccountInfo() {
  const loginStore = useLoginStore()

  const { data, isPending, isError, error } = useQuery(
    computed(() => ({
      ...accountInfoQueryOptions(loginStore.username),
      select: (res: AccountInfoResponse) => res.data
    }))
  )

  return { data, isPending, isError, error }
}
