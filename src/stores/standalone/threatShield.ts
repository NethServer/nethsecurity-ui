//  Copyright (C) 2025 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import { getAxiosErrorMessage, sortByProperty } from '@nethesis/vue-components'
import { defineStore } from 'pinia'
import { useUciPendingChangesStore } from './uciPendingChanges'
import { useNotificationsStore } from '../notifications'

export type Blocklist = {
  name: string
  type: 'community' | 'enterprise' | 'unknown'
  enabled: boolean
  confidence: number
  description: string
}

export type DnsSettings = {
  enabled: boolean
  zones: string[]
  ports: string[]
}

export type DnsBlockedDomain = {
  address: string
  description?: string
}

export const useThreatShieldStore = defineStore('threatShield', () => {
  const { t, te } = useI18n()
  const uciChangesStore = useUciPendingChangesStore()
  const notificationsStore = useNotificationsStore()
  const dnsBlocklists = ref<Blocklist[]>([])
  const dnsSettings = ref<DnsSettings>()
  const dnsZones = ref<string[]>([])
  const dnsBypasses = ref<string[]>([])
  const dnsBlockedDomains = ref<DnsBlockedDomain[]>([])
  const loadingListDnsBlocklists = ref(false)
  const loadingListDnsBlockedDomains = ref(false)
  const loadingListDnsSettings = ref(false)
  const loadingListDnsZones = ref(false)
  const loadingEditDnsSettings = ref(false)
  const loadingEditDnsBlocklist = ref(false)
  const loadingListDnsBypass = ref(false)
  const loadingAddDnsBypass = ref(false)
  const loadingDeleteDnsBypass = ref(false)
  const loadingSaveDnsBlockedDomain = ref(false)
  const loadingDeleteDnsBlockedDomain = ref(false)
  const errorListDnsBlocklists = ref('')
  const errorListDnsBlocklistsDetails = ref('')
  const errorListDnsBlockedDomains = ref('')
  const errorListDnsBlockedDomainsDetails = ref('')
  const errorListDnsSettings = ref('')
  const errorListDnsSettingsDetails = ref('')
  const errorListDnsZones = ref('')
  const errorListDnsZonesDetails = ref('')
  const errorEditDnsSettings = ref('')
  const errorEditDnsSettingsDetails = ref('')
  const errorEditDnsBlocklist = ref('')
  const errorEditDnsBlocklistDetails = ref('')
  const errorListDnsBypass = ref('')
  const errorListDnsBypassDetails = ref('')
  const errorAddDnsBypass = ref('')
  const errorAddDnsBypassDetails = ref('')
  const errorDeleteDnsBypass = ref('')
  const errorDeleteDnsBypassDetails = ref('')
  const errorSaveDnsBlockedDomain = ref('')
  const errorSaveDnsBlockedDomainDetails = ref('')
  const errorDeleteDnsBlockedDomain = ref('')
  const errorDeleteDnsBlockedDomainDetails = ref('')

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
      // show enterprise lists first, then sort alphabetically
      dnsBlocklists.value = blocklists
        .sort(sortByProperty('name'))
        .reverse()
        .sort(sortByProperty('type'))
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
    } catch (err: any) {
      console.error(err)
      errorListDnsBypass.value = t(getAxiosErrorMessage(err))
      errorListDnsBypassDetails.value = err.toString()
    } finally {
      loadingListDnsBypass.value = false
    }
  }

  async function addDnsBypass(address: string) {
    loadingAddDnsBypass.value = true
    errorAddDnsBypass.value = ''
    errorAddDnsBypassDetails.value = ''

    try {
      await ubusCall('ns.threatshield', 'dns-add-bypass', { address })
      uciChangesStore.getChanges()
    } catch (err: any) {
      console.error(err)

      if (!(err instanceof ValidationError)) {
        errorAddDnsBypass.value = t(getAxiosErrorMessage(err))
        errorAddDnsBypassDetails.value = err.toString()
      }
      // rethrow error so it can be caught by the caller
      throw err
    } finally {
      loadingAddDnsBypass.value = false
    }
  }

  async function listDnsBlockedDomains() {
    loadingListDnsBlockedDomains.value = true
    errorListDnsBlockedDomains.value = ''
    errorListDnsBlockedDomainsDetails.value = ''

    try {
      const res = await ubusCall('ns.threatshield', 'dns-list-blocked')
      dnsBlockedDomains.value = res.data.data as DnsBlockedDomain[]
    } catch (err: any) {
      console.error(err)
      errorListDnsBlockedDomains.value = t(getAxiosErrorMessage(err))
      errorListDnsBlockedDomainsDetails.value = err.toString()
    } finally {
      loadingListDnsBlockedDomains.value = false
    }
  }

  async function saveDnsBlockedDomain(domain: DnsBlockedDomain, isEditing = false) {
    loadingSaveDnsBlockedDomain.value = true
    errorSaveDnsBlockedDomain.value = ''
    errorSaveDnsBlockedDomainDetails.value = ''
    const method = isEditing ? 'dns-edit-blocked' : 'dns-add-blocked'

    try {
      await ubusCall('ns.threatshield', method, domain)

      if (!isEditing) {
        // applied instantly, show notification (only if creating)
        notificationsStore.createNotification({
          kind: 'success',
          title: t('standalone.threat_shield_dns.blocked_domain_added_title'),
          description: t('standalone.threat_shield_dns.blocked_domain_added_description', {
            domain: domain.address
          })
        })
      }
    } catch (err: any) {
      console.error(err)

      if (!(err instanceof ValidationError)) {
        errorSaveDnsBlockedDomain.value = t(getAxiosErrorMessage(err))
        errorSaveDnsBlockedDomainDetails.value = err.toString()
      }
      // rethrow error so it can be caught by the caller
      throw err
    } finally {
      loadingSaveDnsBlockedDomain.value = false
    }
  }

  async function deleteDnsBypass(bypass: string) {
    loadingDeleteDnsBypass.value = true
    errorDeleteDnsBypass.value = ''
    errorDeleteDnsBypassDetails.value = ''

    try {
      await ubusCall('ns.threatshield', 'dns-delete-bypass', {
        address: bypass
      })
      uciChangesStore.getChanges()
    } catch (err: any) {
      console.error(err)
      errorDeleteDnsBypass.value = t(getAxiosErrorMessage(err))
      errorDeleteDnsBypassDetails.value = err.toString()
      // rethrow error so it can be caught by the caller
      throw err
    } finally {
      loadingDeleteDnsBypass.value = false
    }
  }

  async function deleteDnsBlockedDomain(domain: string) {
    loadingDeleteDnsBlockedDomain.value = true
    errorDeleteDnsBlockedDomain.value = ''
    errorDeleteDnsBlockedDomainDetails.value = ''

    try {
      await ubusCall('ns.threatshield', 'dns-delete-blocked', {
        address: domain
      })
      // applied instantly, show notification
      notificationsStore.createNotification({
        kind: 'success',
        title: t('standalone.threat_shield_dns.blocked_domain_deleted_title'),
        description: t('standalone.threat_shield_dns.blocked_domain_deleted_description', {
          domain
        })
      })
    } catch (err: any) {
      console.error(err)
      errorDeleteDnsBlockedDomain.value = t(getAxiosErrorMessage(err))
      errorDeleteDnsBlockedDomainDetails.value = err.toString()
      // rethrow error so it can be caught by the caller
      throw err
    } finally {
      loadingDeleteDnsBlockedDomain.value = false
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

  async function listDnsZones() {
    loadingListDnsZones.value = true
    errorListDnsZones.value = ''
    errorListDnsZonesDetails.value = ''

    try {
      const res = await ubusCall('ns.threatshield', 'dns-list-zones')
      dnsZones.value = res.data.data as string[]
    } catch (err: any) {
      console.error(err)
      errorListDnsZones.value = t(getAxiosErrorMessage(err))
      errorListDnsZonesDetails.value = err.toString()
    } finally {
      loadingListDnsZones.value = false
    }
  }

  async function editDnsSettings(settings: DnsSettings) {
    loadingEditDnsSettings.value = true
    errorEditDnsSettings.value = ''
    errorEditDnsSettingsDetails.value = ''

    try {
      await ubusCall('ns.threatshield', 'dns-edit-settings', settings)
      uciChangesStore.getChanges()
    } catch (err: any) {
      console.error(err)

      if (!(err instanceof ValidationError)) {
        errorEditDnsSettings.value = t(getAxiosErrorMessage(err))
        errorEditDnsSettingsDetails.value = err.toString()
      }
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
      uciChangesStore.getChanges()
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

  function searchStringInDnsBlockedDomain(domain: DnsBlockedDomain, queryText: string) {
    const regex = /[^a-zA-Z0-9-_\\.]/g
    queryText = queryText.replace(regex, '')

    // search in domain name and description

    return ['address', 'description'].some((attrName) => {
      const attrValue = domain[attrName as keyof DnsBlockedDomain] as string
      return new RegExp(queryText, 'i').test(attrValue?.replace(regex, ''))
    })
  }

  return {
    dnsBlocklists,
    dnsSettings,
    dnsZones,
    dnsBypasses,
    dnsBlockedDomains,
    isEnterprise,
    loadingListDnsBlocklists,
    loadingListDnsSettings,
    loadingListDnsZones,
    loadingEditDnsSettings,
    loadingEditDnsBlocklist,
    loadingListDnsBypass,
    loadingAddDnsBypass,
    loadingDeleteDnsBypass,
    loadingListDnsBlockedDomains,
    loadingSaveDnsBlockedDomain,
    errorListDnsBlocklists,
    errorListDnsBlocklistsDetails,
    errorListDnsSettings,
    errorListDnsSettingsDetails,
    errorListDnsZones,
    errorListDnsZonesDetails,
    errorEditDnsSettings,
    errorEditDnsSettingsDetails,
    errorEditDnsBlocklist,
    errorEditDnsBlocklistDetails,
    errorListDnsBypass,
    errorListDnsBypassDetails,
    errorListDnsBlockedDomains,
    errorListDnsBlockedDomainsDetails,
    errorAddDnsBypass,
    errorDeleteDnsBypass,
    errorDeleteDnsBypassDetails,
    errorAddDnsBypassDetails,
    errorSaveDnsBlockedDomain,
    errorSaveDnsBlockedDomainDetails,
    listDnsBlocklist,
    listDnsSettings,
    listDnsZones,
    listDnsBlockedDomains,
    editDnsSettings,
    addDnsBypass,
    deleteDnsBypass,
    editDnsBlocklist,
    listDnsBypass,
    saveDnsBlockedDomain,
    deleteDnsBlockedDomain,
    searchStringInDnsBlocklist,
    searchStringInDnsBlockedDomain,
    errorDeleteDnsBlockedDomain,
    errorDeleteDnsBlockedDomainDetails
  }
})
