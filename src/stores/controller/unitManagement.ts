//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { defineStore } from 'pinia'
import axios from 'axios'
import { getControllerApiEndpoint } from '../../lib/config'
import { ref } from 'vue'
import { useLoginStore as useControllerLoginStore } from '@/stores/controller/controllerLogin'
import { useLoginStore as useStandaloneLoginStore } from '@/stores/standalone/standaloneLogin'
import { getJsonFromStorage, saveToStorage } from '@nethserver/vue-tailwind-lib'
import { useRoute } from 'vue-router'
import { useUnitsStore } from './units'

//// merge with units store?

export const useUnitManagementStore = defineStore('unitManagement', () => {
  const unitName: any = ref('')
  const unitToken: any = ref('')

  const controllerLoginStore = useControllerLoginStore()
  const standaloneLoginStore = useStandaloneLoginStore()
  const unitsStore = useUnitsStore()

  // const isManagingUnit = computed(() => { ////
  //   return !isEmpty(unitName.value)
  // })

  const load = () => {
    const route = useRoute()
    const unit = route.params.unitName
    const loginInfo = getJsonFromStorage(`unit-${unit}`)

    if (loginInfo) {
      unitName.value = unit
      unitToken.value = loginInfo.token

      // update standalone login store credentials
      standaloneLoginStore.setUsername(unitName.value)
      standaloneLoginStore.setToken(unitToken.value)
    }
  }

  const addUnit = async (unitName: string) => {
    const res = await axios.post(
      `${getControllerApiEndpoint()}/units`,
      {
        unit_name: unitName
      },
      {
        headers: {
          Authorization: `Bearer ${controllerLoginStore.token}`
        }
      }
    )
    console.log('addUnit res', res.data.data) ////

    //// todo check errors
  }

  const manageUnit = async (unit: string) => {
    const token = await getUnitToken(unit)
    unitToken.value = token
    unitName.value = unit

    const unitLoginInfo = {
      unit,
      token
    }
    saveToStorage(`unit-${unit}`, unitLoginInfo)
  }

  const getUnitToken = async (unit: string) => {
    const res = await axios.get(`${getControllerApiEndpoint()}/units/${unit}/token`, {
      headers: {
        Authorization: `Bearer ${controllerLoginStore.token}`
      }
    })
    console.log('getUnitToken', res.data.data) ////

    //// todo check errors

    return res.data.data.token
  }

  return {
    unitName,
    // isManagingUnit, ////
    load,
    addUnit,
    manageUnit
  }
})
