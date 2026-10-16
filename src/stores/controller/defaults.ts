//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useLoginStore as useControllerLoginStore } from '@/stores/controller/controllerLogin'
import { getControllerApiEndpoint } from '@/lib/config'
import axios from 'axios'

export const useDefaultsStore = defineStore('defaults', () => {
  const controllerLoginStore = useControllerLoginStore()
  const fqdn = ref('')
  const grafanaPath = ref('')
  const validSubscription = ref(false)
  const defaultsLoaded = ref(false)

  const getDefaults = async () => {
    const res = await axios.get(`${getControllerApiEndpoint()}/defaults`, {
      headers: {
        Authorization: `Bearer ${controllerLoginStore.token}`
      }
    })

    if (res.data.data) {
      fqdn.value = res.data.data.fqdn
      grafanaPath.value = res.data.data.grafana_path
      validSubscription.value = res.data.data.valid_subscription
      defaultsLoaded.value = true
    }
  }

  return {
    fqdn,
    grafanaPath,
    validSubscription,
    defaultsLoaded,
    getDefaults
  }
})
