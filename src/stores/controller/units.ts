//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { defineStore } from 'pinia'
import axios from 'axios'
import { getControllerApiEndpoint } from '../../lib/config'
import { ref } from 'vue'
import { useLoginStore as useControllerLoginStore } from '@/stores/controller/controllerLogin'
import { useLoginStore as useStandaloneLoginStore } from '@/stores/standalone/standaloneLogin'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getAxiosErrorMessage, getJsonFromStorage, saveToStorage } from '@nethesis/vue-components'
import { isEmpty } from 'lodash-es'
import { jwtDecode } from 'jwt-decode'

export interface Unit {
  id: string
  ipaddress: string
  netmask: string
  registered: boolean
  connected: boolean
  vpn: UnitVpnData
  info: UnitInfo
  join_code?: string
}

interface UnitInfo {
  fqdn: string
  ssh_port: number
  subscription_type: string
  system_id: string
  unit_id: string
  unit_name: string
  version: string
  api_version: string
  version_update: string
  scheduled_update: number
}

interface UnitVpnData {
  bytes_rcvd: string
  bytes_sent: string
  connected_since: number
  real_address: string
  virtual_address: string
}

export const MAX_NO_SUBSCRIPTION_UNITS = 3

export const useUnitsStore = defineStore('units', () => {
  const { t } = useI18n()
  const controllerLoginStore = useControllerLoginStore()
  const standaloneLoginStore = useStandaloneLoginStore()

  const units = ref<Unit[]>([])
  const unitId = ref('')
  const unitToken = ref('')
  const unitTokenRefreshedTime = ref(0)
  const loadingListUnits = ref(false)
  const errorListUnits = ref('')
  const errorListUnitsDetails = ref('')
  const unitUpdatingPackages = ref<string[]>([])
  const unitUpgradingImage = ref<string[]>([])

  const getUnits = async () => {
    loadingListUnits.value = true
    try {
      const res = await axios.get(`${getControllerApiEndpoint()}/units`, {
        headers: {
          Authorization: `Bearer ${controllerLoginStore.token}`
        }
      })

      const unitsList = (res.data.data || []) as Unit[]

      // set connected attribute
      for (const unit of unitsList) {
        unit.registered = !isEmpty(unit.info)
        unit.connected = !isEmpty(unit.vpn)
      }

      // if version_update is empty, remove the unit from the unitUpgradingImage list
      unitUpgradingImage.value = unitUpgradingImage.value.filter((unit) => {
        return unitsList.find((u) => u.id === unit)?.info.version_update !== ''
      })

      units.value = unitsList.sort(sortUnits)
    } catch (err: any) {
      console.error(err)
      errorListUnits.value = t(getAxiosErrorMessage(err))
      errorListUnitsDetails.value = err.toString()
    } finally {
      loadingListUnits.value = false
    }
  }

  const sortUnits = (a: Unit, b: Unit) => {
    // sort by connection status, then by unit name, then by unit ID
    if (a.connected && !b.connected) {
      return -1
    } else if (b.connected && !a.connected) {
      return 1
    } else {
      // same connection status, sort by unit name
      if (a.info?.unit_name && !b.info?.unit_name) {
        return -1
      } else if (b.info?.unit_name && !a.info?.unit_name) {
        return 1
      } else if (a.info?.unit_name && b.info?.unit_name) {
        return a.info.unit_name.localeCompare(b.info.unit_name)
      } else {
        // sort by unit name
        return a.id.localeCompare(b.id)
      }
    }
  }

  const load = () => {
    const route = useRoute()
    const unit = route.params.unitId as string
    const loginInfo = getJsonFromStorage(`unit-${unit}`)

    if (loginInfo) {
      unitId.value = unit
      unitToken.value = loginInfo.token
      unitTokenRefreshedTime.value = loginInfo.tokenRefreshedTime

      // update standalone login store credentials
      standaloneLoginStore.setUsername(unitId.value)
      standaloneLoginStore.setToken(unitToken.value)
      standaloneLoginStore.setTokenRefreshedTime(unitTokenRefreshedTime.value)
    }
  }

  const addUnit = async (unitId: string) => {
    const res = await axios.post(
      `${getControllerApiEndpoint()}/units`,
      {
        unit_id: unitId
      },
      {
        headers: {
          Authorization: `Bearer ${controllerLoginStore.token}`
        }
      }
    )
    return res.data.data.join_code
  }

  const retrieveAndSaveUnitToken = async (unit: string) => {
    const token = await getUnitToken(unit)
    unitToken.value = token
    unitId.value = unit
    const refreshedTime = new Date().getTime()

    const unitLoginInfo = {
      unit,
      token,
      tokenRefreshedTime: refreshedTime
    }
    saveToStorage(`unit-${unit}`, unitLoginInfo)

    // update standalone login store credentials
    standaloneLoginStore.setUsername(unit)
    standaloneLoginStore.setToken(unitToken.value)
    standaloneLoginStore.setTokenRefreshedTime(refreshedTime)
  }

  const checkUnitToken = async (unitId: string) => {
    const unitsStore = useUnitsStore()

    // check if unit token is already in local storage
    const loginInfo = getJsonFromStorage(`unit-${unitId}`)

    if (loginInfo) {
      // check if token is still valid
      const tokenDecoded: any = jwtDecode(loginInfo.token)
      const tokenExpirationMillis = tokenDecoded.exp * 1000

      const tokenCreationMillis = tokenDecoded.orig_iat * 1000
      const unitConnectionTime =
        (unitsStore.units.find((unit) => unit.id == unitId)?.vpn.connected_since ?? 0) * 1000
      // if the unit connection is newer than the token creation, we need to refresh the token
      if (tokenExpirationMillis > Date.now() && tokenCreationMillis > unitConnectionTime) {
        // unit token is still valid
        return loginInfo.token
      } else {
        // unit token has expired, let's retrieve a new one
        await unitsStore.retrieveAndSaveUnitToken(unitId)
      }
    } else {
      // unit token is not in local storage, let's retrieve it
      await unitsStore.retrieveAndSaveUnitToken(unitId)
    }
  }

  const getUnitToken = async (unit: string) => {
    const res = await axios.get(`${getControllerApiEndpoint()}/units/${unit}/token`, {
      headers: {
        Authorization: `Bearer ${controllerLoginStore.token}`
      }
    })
    return res.data.data.token
  }

  const removeUnit = async (unitId: string) => {
    await axios.delete(`${getControllerApiEndpoint()}/units/${unitId}`, {
      headers: {
        Authorization: `Bearer ${controllerLoginStore.token}`
      }
    })
  }

  const getUnitInfo = async (unitId: string) => {
    await axios.get(`${getControllerApiEndpoint()}/units/${unitId}/info`, {
      headers: {
        Authorization: `Bearer ${controllerLoginStore.token}`
      }
    })
  }

  function addUnitUpdating(unitId: string) {
    unitUpdatingPackages.value.push(unitId)
    setTimeout(() => {
      unitUpdatingPackages.value = unitUpdatingPackages.value.filter((unit) => unit !== unitId)
    }, 10000)
  }

  function addUnitUpgradingImage(unitId: string) {
    unitUpgradingImage.value.push(unitId)
    setTimeout(() => {
      unitUpgradingImage.value = unitUpgradingImage.value.filter((unit) => unit !== unitId)
    }, 60000)
  }

  return {
    units,
    getUnits,
    unitId,
    load,
    addUnit,
    retrieveAndSaveUnitToken,
    checkUnitToken,
    removeUnit,
    loadingListUnits,
    errorListUnits,
    errorListUnitsDetails,
    getUnitInfo,
    unitUpdatingPackages,
    addUnitUpdating,
    unitUpgradingImage,
    addUnitUpgradingImage
  }
})
