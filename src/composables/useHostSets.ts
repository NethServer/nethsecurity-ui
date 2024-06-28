//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import { getAxiosErrorMessage } from '@nethesis/vue-components'
import { useObjects, type IpVersion } from './useObjects'

export type HostSet = {
  id: string
  name: string
  family?: IpVersion
  ipaddr: string[]
  singleton: boolean
  subtype: string
  used?: boolean
  matches?: string[]
}

/**
 * Composable that handles host sets and lists also DHCP reservations, DNS records, VPN accounts. They are managed in Users and object > Objects > Host sets
 */
export function useHostSets() {
  const { t } = useI18n()
  const { getObjectIcon } = useObjects()

  const hostSets = ref<HostSet[]>([])
  const loadingListHostSets = ref(false)
  const errorListHostSets = ref('')
  const errorListHostSetsDetails = ref('')

  const hostSetsComboboxOptions = computed(() => {
    return hostSets.value.map((hostSet) => {
      return {
        id: hostSet.id,
        label: hostSet.name,
        description: t(`standalone.objects.subtype_${hostSet.subtype}`),
        icon: getObjectIcon(hostSet.subtype)
      }
    })
  })

  async function listHostSets() {
    loadingListHostSets.value = true
    hostSets.value = []
    errorListHostSets.value = ''
    errorListHostSetsDetails.value = ''

    try {
      const res = await ubusCall('ns.objects', 'list-hosts')
      hostSets.value = res.data.values as HostSet[]
    } catch (err: any) {
      console.error(err)
      errorListHostSets.value = t(getAxiosErrorMessage(err))
      errorListHostSetsDetails.value = err.toString()
    } finally {
      loadingListHostSets.value = false
    }
  }

  function searchStringInHostSet(hostSet: HostSet, queryText: string) {
    const regex = /[^a-zA-Z0-9-]/g
    queryText = queryText.replace(regex, '')
    let found = false

    // search in string attributes
    found = ['name', 'subtype'].some((attrName) => {
      const attrValue = hostSet[attrName as keyof HostSet] as string
      return new RegExp(queryText, 'i').test(attrValue?.replace(regex, ''))
    })

    if (found) {
      return true
    }

    // search in records (ipaddr attribute)
    found = !!hostSet.ipaddr?.some((record) => {
      return new RegExp(queryText, 'i').test(record?.replace(regex, ''))
    })

    if (found) {
      return true
    }
  }

  return {
    hostSets,
    listHostSets,
    loadingListHostSets,
    errorListHostSets,
    errorListHostSetsDetails,
    hostSetsComboboxOptions,
    searchStringInHostSet
  }
}
