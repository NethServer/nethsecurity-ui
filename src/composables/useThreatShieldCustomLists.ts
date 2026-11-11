//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { ValidationError } from '@/lib/standalone/ubus'
import { getAxiosErrorMessage } from '@nethesis/vue-components'
import type { MessageBag } from '@/lib/validation'

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

// list form texts for validation codes whose generic error.<code> text does not fit
const LIST_FIELD_ERROR_KEYS: Record<string, string> = {
  'name:invalid_name': 'standalone.threat_shield.list_name_invalid',
  'url:required': 'standalone.threat_shield.list_url_required',
  'description:invalid': 'standalone.threat_shield.list_description_invalid'
}

export function getListFieldErrorKey(
  bag: Pick<MessageBag, 'getFirstFor' | 'getFirstI18nKeyFor'>,
  field: string
): string {
  return (
    LIST_FIELD_ERROR_KEYS[`${field}:${bag.getFirstFor(field)}`] ?? bag.getFirstI18nKeyFor(field)
  )
}

// credentials in the URL authority, e.g. https://user:pass@host/
export function hasUrlCredentials(url: string): boolean {
  return /^https?:\/\/[^/?#\s]*@/.test(url.trim())
}
