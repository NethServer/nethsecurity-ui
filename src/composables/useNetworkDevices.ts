//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import { getAxiosErrorMessage } from '@nethesis/vue-components'
import {
  getName,
  type DeviceOrIface,
  type ZoneWithDeviceNames,
  type ZoneWithDevices
} from '@/lib/standalone/network'
import { zonesSorting } from '@/stores/standalone/firewall'

/**
 * Composable that handles the network devices retrieved from the ns.devices list-devices API
 */
export function useNetworkDevices() {
  const { t } = useI18n()

  const allDevices = ref<DeviceOrIface[]>([])
  const devicesByZone = ref<ZoneWithDeviceNames[]>([])
  const loadingListDevices = ref(false)
  const errorListDevices = ref('')
  const errorListDevicesDetails = ref('')

  const sortedZonesAndDevices = computed(() => {
    const zones: ZoneWithDevices[] = []
    devicesByZone.value.forEach((z: ZoneWithDeviceNames) => {
      const deviceList: DeviceOrIface[] = []
      z.devices.forEach((devName: string) => {
        const devFound = allDevices.value.find((dev) => getName(dev) === devName)

        if (devFound) {
          deviceList.push(devFound)
        }
      })
      const zone = { name: z.name, devices: deviceList }
      zones.push(zone)
    })

    return zones.sort(zonesSorting)
  })

  async function listDevices() {
    loadingListDevices.value = true
    allDevices.value = []
    devicesByZone.value = []
    errorListDevices.value = ''
    errorListDevicesDetails.value = ''

    try {
      const res = await ubusCall('ns.devices', 'list-devices')
      const bond_devices = res.data.all_devices
        .filter((device: DeviceOrIface) => device.name?.startsWith('bond-'))
        .map((device: DeviceOrIface) => device.name?.slice(5))

      allDevices.value = res.data.all_devices.filter(
        (device: DeviceOrIface) => !bond_devices.includes(device.name ?? device['.name'])
      )
      devicesByZone.value = res.data.devices_by_zone
    } catch (err: any) {
      console.error(err)
      errorListDevices.value = t(getAxiosErrorMessage(err))
      errorListDevicesDetails.value = err.toString()
    } finally {
      loadingListDevices.value = false
    }
  }

  return {
    allDevices,
    devicesByZone,
    sortedZonesAndDevices,
    listDevices,
    loadingListDevices,
    errorListDevices,
    errorListDevicesDetails
  }
}
