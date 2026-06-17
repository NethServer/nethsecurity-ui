//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Tracks whether a disruptive system action (reboot, system update or image
 * flash) is currently in progress. While such an action runs, the device
 * becomes temporarily unreachable, so polling queries (e.g. alerts) should be
 * paused to avoid spurious errors. The UI reloads once the action completes,
 * which resets this state.
 */
export const useSystemActionStore = defineStore('systemAction', () => {
  const isSystemActionInProgress = ref(false)

  const setSystemActionInProgress = (inProgress: boolean) => {
    isSystemActionInProgress.value = inProgress
  }

  return {
    isSystemActionInProgress,
    setSystemActionInProgress
  }
})
