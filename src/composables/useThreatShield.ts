//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import { getAxiosErrorMessage, sortByProperty } from '@nethesis/vue-components'

export type Blocklist = {
  name: string
  type: 'community' | 'enterprise' | 'unknown'
  enabled: boolean
  confidence: number
  description: string
}

// export type DnsBypass = {
//   //// todo
// }

export type DnsSettings = {
  enabled: boolean
  zones: string[]
  ports: string[]
}

/**
 * Composable that handles threat shield configuration
 */
export function useThreatShield() {
  const { t, te } = useI18n()

  const dnsBlocklists = ref<Blocklist[]>([])
  const dnsSettings = ref<DnsSettings>()
  const dnsBypasses = ref<string[]>([])
  const loadingListDnsBlocklists = ref(false)
  const loadingListDnsSettings = ref(false)
  const loadingEditDnsSettings = ref(false)
  const loadingEditDnsBlocklist = ref(false)
  const loadingListDnsBypass = ref(false)
  const errorListDnsBlocklists = ref('')
  const errorListDnsBlocklistsDetails = ref('')
  const errorListDnsSettings = ref('')
  const errorListDnsSettingsDetails = ref('')
  const errorEditDnsSettings = ref('')
  const errorEditDnsSettingsDetails = ref('')
  const errorEditDnsBlocklist = ref('')
  const errorEditDnsBlocklistDetails = ref('')
  const errorListDnsBypass = ref('')
  const errorListDnsBypassDetails = ref('')

  const isEnterprise = computed(() => {
    return dnsBlocklists.value.some((x) => x.type === 'enterprise')
  })

  async function listDnsBlocklist() {
    loadingListDnsBlocklists.value = true
    errorListDnsBlocklists.value = ''
    errorListDnsBlocklistsDetails.value = ''

    try {
      const res = await ubusCall('ns.threatshield', 'dns-list-blocklist')
      const blocklists = res.data.data as Blocklist[]
      // sort by confidence in descending order and then alphabetically
      dnsBlocklists.value = blocklists
        .sort(sortByProperty('name'))
        .reverse()
        .sort(sortByProperty('confidence'))
        .reverse()
    } catch (err: any) {
      console.error(err)
      errorListDnsBlocklists.value = t(getAxiosErrorMessage(err))
      errorListDnsBlocklistsDetails.value = err.toString()
    } finally {
      loadingListDnsBlocklists.value = false
    }
  }

  async function listDnsBypass() {
    loadingListDnsBypass.value = true
    errorListDnsBypass.value = ''
    errorListDnsBypassDetails.value = ''

    try {
      const res = await ubusCall('ns.threatshield', 'dns-list-bypass')
      dnsBypasses.value = res.data.data as string[]
      // dnsBypasses.value = bypasses.sort(sortByProperty('name')) //// check sort
    } catch (err: any) {
      console.error(err)
      errorListDnsBypass.value = t(getAxiosErrorMessage(err))
      errorListDnsBypassDetails.value = err.toString()
    } finally {
      loadingListDnsBypass.value = false
    }
  }

  async function listDnsSettings() {
    loadingListDnsSettings.value = true
    errorListDnsSettings.value = ''
    errorListDnsSettingsDetails.value = ''

    try {
      const res = await ubusCall('ns.threatshield', 'dns-list-settings')
      dnsSettings.value = res.data.data as DnsSettings
    } catch (err: any) {
      console.error(err)
      errorListDnsSettings.value = t(getAxiosErrorMessage(err))
      errorListDnsSettingsDetails.value = err.toString()
    } finally {
      loadingListDnsSettings.value = false
    }
  }

  async function editDnsSettings(settings: DnsSettings) {
    loadingEditDnsSettings.value = true
    errorEditDnsSettings.value = ''
    errorEditDnsSettingsDetails.value = ''

    try {
      await ubusCall('ns.threatshield', 'dns-edit-settings', settings)
    } catch (err: any) {
      console.error(err)
      errorEditDnsSettings.value = t(getAxiosErrorMessage(err))
      errorEditDnsSettingsDetails.value = err.toString()
      // rethrow error so it can be caught by the caller
      throw err
    } finally {
      loadingEditDnsSettings.value = false
    }
  }

  async function editDnsBlocklist(blocklist: string, enabled: boolean) {
    loadingEditDnsBlocklist.value = true
    errorEditDnsBlocklist.value = ''
    errorEditDnsBlocklistDetails.value = ''

    try {
      await ubusCall('ns.threatshield', 'dns-edit-blocklist', {
        blocklist: blocklist,
        enabled: enabled
      })
    } catch (err: any) {
      console.error(err)
      errorEditDnsBlocklist.value = t(getAxiosErrorMessage(err))
      errorEditDnsBlocklistDetails.value = err.toString()
      // rethrow error so it can be caught by the caller
      throw err
    } finally {
      loadingEditDnsBlocklist.value = false
    }
  }

  function searchStringInDnsBlocklist(blocklist: Blocklist, queryText: string) {
    const regex = /[^a-zA-Z0-9-_]/g
    queryText = queryText.replace(regex, '')
    let found = false

    // search in blocklist name and type

    found = ['name', 'type'].some((attrName) => {
      const attrValue = blocklist[attrName as keyof Blocklist] as string
      return new RegExp(queryText, 'i').test(attrValue?.replace(regex, ''))
    })

    if (found) {
      return found
    }

    // search in blocklist description (internationalized)

    const i18nDescriptionKey = `standalone.threat_shield_dns.description_${blocklist.name}`

    // check if the i18n description exists
    if (te(i18nDescriptionKey)) {
      found = new RegExp(queryText, 'i').test(t(i18nDescriptionKey)?.replace(regex, ''))

      if (found) {
        return found
      }
    }
    return false
  }

  return {
    dnsBlocklists,
    dnsSettings,
    dnsBypasses,
    isEnterprise,
    loadingListDnsBlocklists,
    loadingListDnsSettings,
    loadingEditDnsSettings,
    loadingEditDnsBlocklist,
    loadingListDnsBypass,
    errorListDnsBlocklists,
    errorListDnsBlocklistsDetails,
    errorListDnsSettings,
    errorListDnsSettingsDetails,
    errorEditDnsSettings,
    errorEditDnsSettingsDetails,
    errorEditDnsBlocklist,
    errorEditDnsBlocklistDetails,
    errorListDnsBypass,
    errorListDnsBypassDetails,
    listDnsBlocklist,
    listDnsSettings,
    editDnsSettings,
    editDnsBlocklist,
    listDnsBypass,
    searchStringInDnsBlocklist
  }
}
