//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { onMounted, onUnmounted, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { useI18n } from 'vue-i18n'
import { getAxiosErrorMessage } from '@nethesis/vue-components'
import { upperFirst } from 'lodash-es'

export type TopHost = {
  host: string
  ip: string
  mac: string
  totals: TopHostTotal
}

type TopHostTotal = {
  bandwidth: number
  download: number
  packets: number
  upload: number
}

export type TopItem = {
  name: string
  value: number
}

export function useTopTalkers(limit: MaybeRefOrGetter<number> = 20) {
  // random refresh interval between 20 and 30 seconds
  const REFRESH_INTERVAL = 20000 + Math.random() * 10 * 1000
  const { t } = useI18n()
  const intervalId = ref(0)
  const topHosts = ref<TopHost[]>([])
  const topApps = ref<TopItem[]>([])
  const topProtocols = ref<TopItem[]>([])
  const loadingTopTalkers = ref(true)
  const errorTopTalkers = ref('')
  const errorTopTalkersDescription = ref('')

  onMounted(() => {
    getTopTalkers()

    // periodically reload data
    intervalId.value = setInterval(getTopTalkers, REFRESH_INTERVAL)
  })

  onUnmounted(() => {
    if (intervalId.value) {
      clearInterval(intervalId.value)
    }
  })

  async function getTopTalkers() {
    errorTopTalkers.value = ''
    errorTopTalkersDescription.value = ''

    try {
      const res = await ubusCall('ns.talkers', 'list', {
        limit: toValue(limit)
      })

      topApps.value = res.data.talkers.top_apps.map((app: any) => {
        // beautify app names
        if (app.name.includes('netify.unclassified')) {
          app.name = t('common.unknown')
        } else {
          if (app.name.includes('netify.')) {
            app.name = app.name.split('netify.')[1]
          }
          app.name = upperFirst(app.name)
        }
        return app
      })
      topHosts.value = res.data.talkers.top_hosts
      topProtocols.value = res.data.talkers.top_protocols
    } catch (err: any) {
      console.error(err)
      errorTopTalkers.value = t('error.cannot_retrieve_talkers_list')
      errorTopTalkersDescription.value = t(getAxiosErrorMessage(err))
    } finally {
      loadingTopTalkers.value = false
    }
  }

  return {
    topApps,
    topHosts,
    topProtocols,
    loadingTopTalkers,
    errorTopTalkers,
    errorTopTalkersDescription
  }
}
