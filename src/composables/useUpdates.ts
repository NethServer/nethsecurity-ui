import { ubusCall, ubusCallFromController } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'

type SuccessfulResponse = AxiosResponse<{
  message: string
}>

type UpdateResponse = AxiosResponse<{
  updates: PackageUpdateInfo[]
}>

export type PackageUpdateInfo = {
  currentVersion: string
  latestVersion: string
  package: string
}

type CheckSystemUpdateResponse = AxiosResponse<{
  currentVersion: string
  lastVersion: string
  scheduledAt: number
}>

/**
 * Composable that provides update for units.
 */
export function useUpdates() {
  /**
   * Update the package index
   */
  function updatePackageIndex(unitId?: string): Promise<UpdateResponse> {
    if (unitId) {
      return ubusCallFromController('ns.update', 'check-package-updates', {}, unitId)
    }
    return ubusCall('ns.update', 'check-package-updates', {})
  }

  /**
   * Upgrade all packages
   */
  function upgradePackages(unitId?: string): Promise<SuccessfulResponse> {
    if (unitId) {
      return ubusCallFromController('ns.update', 'install-package-updates', {}, unitId)
    }
    return ubusCall('ns.update', 'install-package-updates')
  }

  /**
   * Check for image system update
   */
  function checkUnitImageUpdate(unitId?: string): Promise<CheckSystemUpdateResponse> {
    if (unitId) {
      return ubusCallFromController('ns.update', 'check-system-update', {}, unitId)
    }
    return ubusCall('ns.update', 'check-system-update')
  }

  /**
   * Upgrade the system
   */
  function upgradeUnitImage(unitId?: string): Promise<SuccessfulResponse> {
    if (unitId) {
      return ubusCallFromController('ns.update', 'update-system', {}, unitId)
    }
    return ubusCall('ns.update', 'update-system')
  }

  /**
   * Schedule a system upgrade
   */
  function scheduleUpgradeUnitImage(
    scheduleAt: Date,
    unitId?: string
  ): Promise<SuccessfulResponse> {
    const scheduleAtTimestamp = Math.floor(scheduleAt.getTime() / 1000)
    if (unitId) {
      return ubusCallFromController(
        'ns.update',
        'schedule-system-update',
        { scheduleAt: scheduleAtTimestamp },
        unitId
      )
    }
    return ubusCall('ns.update', 'schedule-system-update', { scheduleAt: scheduleAtTimestamp })
  }

  function abortScheduledUpgradeUnitImage(unitId: string): Promise<SuccessfulResponse> {
    if (unitId) {
      return ubusCallFromController(
        'ns.update',
        'schedule-system-update',
        {
          scheduleAt: -1
        },
        unitId
      )
    }
    return ubusCall('ns.update', 'schedule-system-update', { scheduleAt: -1 })
  }

  return {
    updatePackageIndex,
    upgradePackages,
    checkUnitImageUpdate,
    upgradeUnitImage,
    scheduleUpgradeUnitImage,
    abortScheduledUpgradeUnitImage
  }
}
