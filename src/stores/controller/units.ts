//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { defineStore } from 'pinia'
import axios from 'axios'
import { getControllerApiEndpoint } from '../../lib/config'
import { ref } from 'vue'
import { useLoginStore } from '@/stores/controller/controllerLogin'

//// review

export const useUnitsStore = defineStore('units', () => {
  const loginStore = useLoginStore()
  const units: any = ref([])

  const getUnits = async () => {
    const res = await axios.get(
      `${getControllerApiEndpoint()}/servers`, //// rename api to "units"
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginStore.accessToken}`
        }
      }
    )
    console.log('units', res) ////

    units.value = res.data
  }

  return {
    units,
    getUnits
  }
})
