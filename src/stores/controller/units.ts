//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { defineStore } from 'pinia'
import axios from 'axios'
import { getControllerApiEndpoint } from '../../lib/config'
import { ref } from 'vue'
import { useLoginStore } from '@/stores/controller/controllerLogin'

//// merge with unitManagement? Remove this store and only use api?

export const useUnitsStore = defineStore('units', () => {
  const loginStore = useLoginStore()
  const units: any = ref([])

  const getUnits = async () => {
    const res = await axios.get(`${getControllerApiEndpoint()}/units`, {
      headers: {
        Authorization: `Bearer ${loginStore.token}`
      }
    })
    console.log('units', res) ////

    //// todo check errors

    if (res.data.data) {
      units.value = res.data.data
    }
  }

  return {
    units,
    getUnits
  }
})
