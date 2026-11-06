//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { useQuery } from '@tanstack/vue-query'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import { getAxiosErrorMessage } from '@nethesis/vue-components'

export type AllowlistUrl = {
  name: string
  builtin: boolean
  url: string
  description: string
  enabled: boolean
}

export const ALLOWLIST_URLS_KEY = ['threatshield', 'allowlist-urls']

// i18n key for a mutation error, using the validation message of field when present
export function getMutationErrorKey(error: unknown, field: string): string {
  if (error instanceof ValidationError) {
    const key = error.errorBag.getFirstI18nKeyFor(field)
    if (key) {
      return key
    }
  }
  return getAxiosErrorMessage(error)
}

export function useAllowlistUrls() {
  return useQuery({
    queryKey: ALLOWLIST_URLS_KEY,
    queryFn: ({ signal }) =>
      ubusCall<{ data: { data: AllowlistUrl[] } }>(
        'ns.threatshield',
        'list-allowlist-urls',
        {},
        { signal }
      ),
    select: (res) => res.data.data
  })
}
