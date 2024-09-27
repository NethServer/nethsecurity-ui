import type { Unit } from '@/stores/controller/units'
import { ubusCall, ubusCallFromController } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'

type SuccessfulResponse = AxiosResponse<{
  message: string
}>

type UpdateResponse = AxiosResponse<{
  updates: {
    currentVersion: string
    latestVersion: string
    package: string
  }[]
}>

type CheckSystemUpdateResponse = AxiosResponse<{
  currentVersion: string
  lastVersion: string
  scheduleAt: number
}>

/**
 * Composable that provides update for units.
 */
export function useUpdates() {
  /**
   * Update the package index
   */
  function updatePackageIndex(unit?: Unit): Promise<UpdateResponse> {
    if (unit) {
      return ubusCallFromController('ns.update', 'check-package-updates', {}, unit.id)
    }
    return ubusCall('ns.update', 'check-package-updates', {})
  }

  /**
   * Upgrade all packages
   */
  function upgradePackages(unit?: Unit): Promise<SuccessfulResponse> {
    if (unit) {
      return ubusCallFromController('ns.update', 'install-package-updates', {}, unit.id)
    }
    return ubusCall('ns.update', 'install-package-updates')
  }

  /**
   * Check for image system update
   */
  function updateUnitImage(unit?: Unit): Promise<CheckSystemUpdateResponse> {
    if (unit) {
      return ubusCallFromController('ns.update', 'check-system-update', {}, unit.id)
    }
    return ubusCall('ns.update', 'check-system-update')
  }

  /**
   * Upgrade the system
   */
  function upgradeUnitImage(unit?: Unit): Promise<SuccessfulResponse> {
    if (unit) {
      return ubusCallFromController('ns.update', 'update-system', {}, unit.id)
    } else {
      return ubusCall('ns.update', 'update-system')
    }
  }

  /**
   * Schedule a system upgrade
   */
  function scheduleUpgradeUnitImage(scheduleAt: Date, unit?: Unit): Promise<SuccessfulResponse> {
    const scheduleAtTimestamp = Math.floor(scheduleAt.getTime() / 1000)
    if (unit) {
      return ubusCallFromController(
        'ns.update',
        'schedule-system-update',
        { scheduleAt: scheduleAtTimestamp },
        unit.id
      )
    } else {
      return ubusCall('ns.update', 'schedule-system-update', { scheduleAt: scheduleAtTimestamp })
    }
  }

  return {
    updatePackageIndex,
    upgradePackages,
    updateUnitImage,
    upgradeUnitImage,
    scheduleUpgradeUnitImage
  }
}
