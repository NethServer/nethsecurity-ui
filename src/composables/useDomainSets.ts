//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import {
  faDesktop,
  faNetworkWired,
  faArrowsLeftRightToLine,
  faAddressCard,
  faBoxArchive,
  faGlobe,
  faCircleQuestion
} from '@fortawesome/free-solid-svg-icons'
import { library } from '@fortawesome/fontawesome-svg-core'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import { getAxiosErrorMessage } from '@nethesis/vue-components'
import type { IpVersion } from './useObjects'

export type DomainSet = {
  id: string
  name: string
  family?: IpVersion
  domain: string[]
  timeout: string
  used?: boolean
  matches?: string[]
}

/**
 * Composable that handles domain sets. They are managed in Users and object > Objects > Domain sets
 */
export function useDomainSets() {
  const { t } = useI18n()

  const domainSets = ref<DomainSet[]>([])
  const loadingListDomainSets = ref(false)
  const errorListDomainSets = ref('')
  const errorListDomainSetsDetails = ref('')

  library.add(faDesktop)
  library.add(faNetworkWired)
  library.add(faArrowsLeftRightToLine)
  library.add(faAddressCard)
  library.add(faBoxArchive)
  library.add(faGlobe)
  library.add(faCircleQuestion)

  async function listDomainSets() {
    loadingListDomainSets.value = true
    domainSets.value = []
    errorListDomainSets.value = ''
    errorListDomainSetsDetails.value = ''

    try {
      const res = await ubusCall('ns.objects', 'list-domain-sets')
      domainSets.value = res.data.values as DomainSet[]
    } catch (err: any) {
      console.error(err)
      errorListDomainSets.value = t(getAxiosErrorMessage(err))
      errorListDomainSetsDetails.value = err.toString()
    } finally {
      loadingListDomainSets.value = false
    }
  }

  function searchStringInDomainSet(domainSet: DomainSet, queryText: string) {
    const regex = /[^a-zA-Z0-9-]/g
    queryText = queryText.replace(regex, '')
    let found = false

    // search in string attributes
    found = ['name'].some((attrName) => {
      const attrValue = domainSet[attrName as keyof DomainSet] as string
      return new RegExp(queryText, 'i').test(attrValue?.replace(regex, ''))
    })

    if (found) {
      return true
    }

    // search in records (domain attribute)
    found = !!domainSet.domain?.some((record) => {
      return new RegExp(queryText, 'i').test(record?.replace(regex, ''))
    })

    if (found) {
      return true
    }
  }

  return {
    domainSets,
    listDomainSets,
    loadingListDomainSets,
    errorListDomainSets,
    errorListDomainSetsDetails,
    searchStringInDomainSet
  }
}
